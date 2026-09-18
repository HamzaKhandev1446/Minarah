import { describe, expect, it, vi, afterEach } from "vitest";
vi.mock("server-only", () => ({}));
import { discoverMosques } from "@/server/mosques";
import { POST } from "@/app/api/discovery/route";
import {
  currentSchedule,
  formatPublishedAt,
  discoveryQuerySchema,
  jamaatTimingState,
  locationErrorMessage,
  remainingLabel,
} from "@/domain/discovery";
import { parseFollows, toggleFollow, followsKey } from "@/lib/follows/storage";
import { mapMosque, mapSchedule } from "@/server/public-mappers";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const now = "2026-09-07T18:00:00Z";
const id = "00000000-0000-4000-8000-000000000001";
describe("public discovery", () => {
  it("formats publication in the mosque timezone with ordinal dates", () => {
    expect(formatPublishedAt("2026-09-09T13:00:00Z", "Asia/Karachi")).toBe("Last updated: 9th Sept 6 pm");
    expect(formatPublishedAt("2026-09-21T08:35:00Z", "Asia/Karachi")).toBe("Last updated: 21st Sept 1:35 pm");
  });
  it("activates Jumuah only on the mosque's local Friday", async () => {
    for (const [instant, friday] of [["2026-09-17T18:00:00Z", false], ["2026-09-17T20:00:00Z", true]] as const) {
      const data = await discoverMosques({kind: "search", query: "Cedar"}, "demo", instant);
      const result = data.results[0];
      if (!result) throw new Error("Missing demo fixture");
      expect(currentSchedule(result, instant).fridaySessions.length > 0).toBe(friday);
    }
  });
  it("classifies the Jamaat timing windows", () => {
    const now = "2026-09-16T12:00:00.000Z";
    expect(jamaatTimingState("2026-09-16T12:10:00.000Z", now)).toBe("nearly");
    expect(jamaatTimingState("2026-09-16T12:00:00.000Z", now)).toBe("live");
    expect(jamaatTimingState("2026-09-16T11:59:00.000Z", now)).toBe("live");
    expect(jamaatTimingState("2026-09-16T11:55:00.000Z", now)).toBe("live");
    expect(jamaatTimingState("2026-09-16T11:54:00.000Z", now)).toBe("recent");
    expect(jamaatTimingState("2026-09-16T11:53:00.000Z", now)).toBe("recent");
    expect(jamaatTimingState("2026-09-16T11:52:00.000Z", now)).toBeNull();
    expect(jamaatTimingState("2026-09-16T12:11:00.000Z", now)).toBeNull();
  });
  it("searches demo names/cities, returns only matches, and resolves details", async () => {
    expect(
      (await discoverMosques({ kind: "search", query: "Karachi" }, "demo", now))
        .results,
    ).toHaveLength(10);
    const result = await discoverMosques(
      { kind: "search", query: "cedar" },
      "demo",
      now,
    );
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.mosque.isSynthetic).toBe(true);
    expect(
      (await discoverMosques({ kind: "detail", slug: "missing" }, "demo", now))
        .results,
    ).toEqual([]);
    expect(
      (await discoverMosques({ kind: "followed", ids: [id] }, "demo", now))
        .results[0]?.mosque.id,
    ).toBe(id);
  });
  it("bounds and sorts server-side demo proximity without inventing empty results", async () => {
    const response = await discoverMosques(
      { kind: "nearby", latitude: 24.8615, longitude: 67.011 },
      "demo",
      now,
    );
    expect(response.results[0]?.distanceMeters).toBe(0);
    expect(response.results.map((r) => r.distanceMeters)).toEqual(
      response.results.map((r) => r.distanceMeters).sort((a, b) => a! - b!),
    );
    expect(
      (
        await discoverMosques(
          { kind: "nearby", latitude: 0, longitude: 0 },
          "demo",
          now,
        )
      ).results,
    ).toEqual([]);
  });
  it("never falls back to demo when live configuration is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    await expect(
      discoverMosques({ kind: "search", query: "Karachi" }, "live", now),
    ).rejects.toThrow("not connected");
  });
  it("re-resolves dates when the mosque crosses midnight", async () => {
    const result = (
      await discoverMosques(
        { kind: "detail", slug: "sample-cedar" },
        "demo",
        now,
      )
    ).results[0]!;
    expect(
      currentSchedule(result, "2026-09-07T18:59:59Z").today.localDate,
    ).toBe("2026-09-07");
    expect(
      currentSchedule(result, "2026-09-07T19:00:00Z").today.localDate,
    ).toBe("2026-09-08");
    expect(
      currentSchedule(result, "2026-09-07T19:00:00Z").today.entries.find(
        (e) => e.prayer === "isha",
      )?.localTime,
    ).toBe("20:45");
    expect(remainingLabel(0)).toBe("Now");
    expect(remainingLabel(61000)).toBe("In 2 min");
  });
  it("rejects invalid query boundaries and distinguishes location errors", () => {
    expect(
      discoveryQuerySchema.safeParse({ kind: "search", query: " " }).success,
    ).toBe(false);
    expect(
      discoveryQuerySchema.safeParse({
        kind: "nearby",
        latitude: 91,
        longitude: 0,
      }).success,
    ).toBe(false);
    expect(
      discoveryQuerySchema.safeParse({
        kind: "followed",
        ids: Array(51).fill(id),
      }).success,
    ).toBe(false);
    expect(locationErrorMessage(1)).toContain("denied");
    expect(locationErrorMessage(2)).toContain("unavailable");
    expect(locationErrorMessage(3)).toContain("timed out");
  });
  it("validates API input, blocks cross-origin requests and disables caching", async () => {
    const request = (body: unknown, origin = "http://localhost:3000") =>
      new Request("http://localhost:3000/api/discovery", {
        method: "POST",
        headers: { origin },
        body: JSON.stringify(body),
      });
    expect(
      (
        await POST(
          request({ mode: "demo", query: { kind: "search", query: "c" } }),
        )
      ).status,
    ).toBe(400);
    expect((await POST(request({}, "https://other.test"))).status).toBe(403);
    const response = await POST(
      request({ mode: "demo", query: { kind: "search", query: "cedar" } }),
    );
    expect(response.status).toBe(200);
    const proxied = new Request("http://localhost:3000/api/discovery", {
      method: "POST",
      headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
      body: JSON.stringify({
        mode: "demo",
        query: { kind: "search", query: "cedar" },
      }),
    });
    expect((await POST(proxied)).status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect((await response.json()).results).toHaveLength(1);
  });
});
describe("anonymous follow storage", () => {
  it("persists explicit toggles, survives rereads and separates live/demo", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    toggleFollow(storage, "demo", id);
    expect(parseFollows(storage.getItem(followsKey("demo")))).toEqual([id]);
    expect(parseFollows(storage.getItem(followsKey("live")))).toEqual([]);
    toggleFollow(storage, "demo", id);
    expect(parseFollows(storage.getItem(followsKey("demo")))).toEqual([]);
  });
  it("recovers from malformed data and propagates write failures without claiming success", () => {
    expect(parseFollows("broken")).toEqual([]);
    expect(parseFollows('["invalid"]')).toEqual([]);
    expect(parseFollows(JSON.stringify([id, id]))).toEqual([id]);
    expect(() =>
      toggleFollow(
        {
          getItem: () => null,
          setItem: () => {
            throw new Error("quota");
          },
        },
        "live",
        id,
      ),
    ).toThrow("quota");
  });
});
describe("public row mapping", () => {
  it.each(["2026-09-30", null])(
    "uses anonymous requests for dated and ongoing schedules (%s)",
    async (effectiveTo) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://directory.example.test");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
      const requests: { url: URL; init?: RequestInit }[] = [];
      const mosque = {
        id,
        slug: "test-mosque",
        name: "Test Mosque",
        address_line: "Example Street",
        locality: "Centre",
        city: "Berlin",
        country_code: "DE",
        latitude: 52.52,
        longitude: 13.4,
        timezone: "Europe/Berlin",
        verification_status: "verified",
        is_synthetic: false,
      };
      vi.stubGlobal(
        "fetch",
        async (input: string | URL, init?: RequestInit) => {
          const url = new URL(String(input));
          requests.push({ url, init });
          if (url.pathname.endsWith("/search_mosques"))
            return Response.json([mosque]);
          if (url.pathname.endsWith("/jamaat_schedules"))
            return Response.json([
              {
                id,
                mosque_id: id,
                effective_from: "2026-09-01",
                effective_to: effectiveTo,
                status: "published",
                revision: 1,
                published_at: now,
                jamaat_schedule_entries: [
                  { prayer: "isha", local_time: "20:30:00" },
                ],
                jumuah_sessions: [],
                schedule_overrides: [],
              },
            ]);
          throw new Error("Unexpected repository request");
        },
      );
      const result = await discoverMosques(
        { kind: "search", query: "Berlin" },
        "live",
        now,
      );
      expect(result.results[0]?.mosque.timezone).toBe("Europe/Berlin");
      expect(result.results[0]?.schedules[0]?.entries[0]?.localTime).toBe(
        "20:30",
      );
      expect(requests).toHaveLength(2);
      expect(requests[1]?.url.searchParams.get("status")).toBe("eq.published");
      expect(requests[1]?.url.searchParams.get("or")).toContain(
        "effective_to.is.null",
      );
      expect(result.results[0]?.schedules[0]?.effectiveTo).toBe(effectiveTo);
      for (const request of requests) {
        expect(request.init?.cache).toBe("no-store");
        const headers = new Headers(request.init?.headers);
        expect(headers.has("cookie")).toBe(false);
        expect(headers.get("apikey")).toBe("test-public-key");
      }
    },
  );
  it("rejects draft schedules and rejected mosques before domain use", () => {
    expect(() => mapSchedule({ status: "draft" })).toThrow();
    expect(() => mapMosque({ verification_status: "rejected" })).toThrow();
  });
});
