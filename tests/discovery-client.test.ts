import { afterEach, expect, it, vi } from "vitest";
import { fetchDiscovery } from "@/lib/discovery-client";
import { getSampleData } from "@/data/sample";
const now = "2026-09-18T00:00:00Z";
const sample = getSampleData(now);
const response = {
  fetchedAt: now,
  radiusMeters: 800,
  results: [
    {
      mosque: sample.mosques[0]!,
      schedules: [sample.schedules[0]!],
      distanceMeters: 25,
    },
  ],
};
afterEach(() => vi.unstubAllGlobals());
it("keeps coordinates in a no-store POST and validates published response", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(response));
  vi.stubGlobal("fetch", fetch);
  const query = { kind: "nearby" as const, latitude: 24.87, longitude: 67.02 };
  expect(await fetchDiscovery(query, "live")).toEqual(response);
  expect(fetch).toHaveBeenCalledWith(
    "/api/discovery",
    expect.objectContaining({
      method: "POST",
      cache: "no-store",
      body: JSON.stringify({ query, mode: "live" }),
    }),
  );
});
it("preserves actionable server errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ error: "Directory unavailable" }, { status: 503 }),
      ),
  );
  await expect(
    fetchDiscovery({ kind: "search", query: "Karachi" }, "live"),
  ).rejects.toThrow("Directory unavailable");
});
it.each([
  null,
  {},
  {
    ...response,
    results: [
      {
        ...response.results[0],
        schedules: [{ ...sample.schedules[0], status: "draft" }],
      },
    ],
  },
])("rejects invalid or private data", async (payload) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));
  await expect(
    fetchDiscovery({ kind: "search", query: "Karachi" }, "live"),
  ).rejects.toThrow("temporarily unavailable");
});
it("handles a non-JSON proxy error without exposing its response", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("<html>upstream error</html>", { status: 502 }),
      ),
  );
  await expect(
    fetchDiscovery({ kind: "search", query: "Karachi" }, "live"),
  ).rejects.toThrow("Could not load mosque information");
});
