import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { getSampleData } from "@/data/sample";
import { planMosquePush } from "@/domain/push-notifications";
import { pushEndpointSchema } from "@/lib/push-contract";
vi.mock("server-only", () => ({}));
import { reportOperationalEvent } from "@/server/operational-events";

const db = new PGlite();
beforeAll(async () => {
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls;",
  );
  await db.exec(
    await readFile("supabase/migrations/202609190008_device_push.sql", "utf8"),
  );
});
afterAll(() => db.close());
it("blocks public reads and preserves device ownership and exclusive dispatch leases", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const subscription = JSON.stringify({
    endpoint: "https://fcm.googleapis.com/send/device",
    keys: {},
  });
  await db.query(
    "select public.save_device_push($1,$2,$3,'{}','{\"enabled\":true}')",
    [id, "a".repeat(64), subscription],
  );
  await expect(
    db.query(
      "select public.save_device_push($1,$2,$3,'{}','{\"enabled\":true}')",
      [id, "b".repeat(64), subscription],
    ),
  ).rejects.toThrow("Invalid device credential");
  await db.exec("set role anon");
  await expect(
    db.query("select * from public.device_push_subscriptions"),
  ).rejects.toThrow("permission denied");
  await expect(
    db.query("select * from public.claim_device_push(20)"),
  ).rejects.toThrow("permission denied");
  await db.exec("reset role");
  expect(
    (await db.query("select * from public.claim_device_push(20)")).rows,
  ).toHaveLength(1);
  expect(
    (await db.query("select * from public.claim_device_push(20)")).rows,
  ).toHaveLength(0);
  await db.query(
    "select public.save_device_push($1,$2,$3,'{}','{\"enabled\":false}')",
    [id, "a".repeat(64), subscription],
  );
  expect(
    (await db.query("select lease_id from public.device_push_subscriptions"))
      .rows,
  ).toEqual([{ lease_id: null }]);
});
it("does not allow arbitrary URLs as push destinations", () => {
  for (const endpoint of [
    "http://127.0.0.1/",
    "https://example.com/",
    "https://fcm.googleapis.com.evil.test/",
    "https://fcm.googleapis.com:8080/",
  ])
    expect(pushEndpointSchema.safeParse(endpoint).success).toBe(false);
  expect(
    pushEndpointSchema.safeParse("https://fcm.googleapis.com/fcm/send/test")
      .success,
  ).toBe(true);
});
it("deduplicates Friday reminders and establishes a silent publication baseline", () => {
  const now = "2026-09-18T08:35:00Z";
  const sample = getSampleData(now);
  const result = {
    mosque: { ...sample.mosques[0]!, isSynthetic: false },
    distanceMeters: null,
    schedules: [
      {
        ...sample.schedules[0]!,
        jumuahSessions: [{ position: 1, localTime: "13:45", label: "Jumuah" }],
      },
    ],
  };
  const prefs = {
    enabled: true,
    reminders: true,
    changes: true,
    minutes: 10 as const,
  };
  const first = planMosquePush(result, now, prefs);
  expect(first.messages).toHaveLength(1);
  expect(first.messages[0]?.title).toContain("Jumuah");
  expect(first.messages[0]?.ttl).toBe(600);
  expect(
    planMosquePush(result, now, prefs, first.cursor).messages,
  ).toHaveLength(0);
  expect(
    planMosquePush(result, now, { ...prefs, enabled: false }).messages,
  ).toHaveLength(0);
  expect(
    planMosquePush(
      { ...result, mosque: { ...result.mosque, isSynthetic: true } },
      now,
      prefs,
    ).messages,
  ).toHaveLength(0);
});
it("operational logs contain only a fixed event, reference and timestamp", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const reference = reportOperationalEvent("discovery_unavailable");
  const data = JSON.parse(log.mock.calls[0]![0]);
  expect(Object.keys(data).sort()).toEqual(["at", "event", "reference"]);
  expect(data.reference).toBe(reference);
  log.mockRestore();
});
