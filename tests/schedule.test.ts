import { describe, expect, it } from "vitest";
import { getSampleData } from "@/data/sample";
import {
  getNextJamaat,
  localJamaatInstant,
  mosqueLocalDate,
  resolveMosqueSchedule,
} from "@/domain/schedule";
import {
  scheduleDraftSchema,
  nearbyQuerySchema,
  qrCodeSchema,
  timezoneSchema,
} from "@/domain/validation";
import { canManageMosque } from "@/domain/authorization";
import type { JamaatSchedule } from "@/domain/types";

const { schedules, mosques } = getSampleData("2026-09-07T00:00:00Z");
const mosqueId = mosques[0]!.id;
const base = schedules[0]!;
const resolve = (date: string, list: JamaatSchedule[] = schedules) =>
  resolveMosqueSchedule({ mosqueId, localDate: date, schedules: list });

describe("published schedule resolution", () => {
  it("resolves only the requested mosque and published period", () => {
    expect(resolve("2026-09-07").entries).toHaveLength(5);
    expect(resolve("2030-01-01").entries).toEqual([]);
    expect(
      resolve("2026-09-07", [{ ...base, status: "draft" }]).entries,
    ).toEqual([]);
    expect(
      resolve("2026-09-07", [{ ...base, status: "archived" }]).entries,
    ).toEqual([]);
  });
  it("applies an override only on its date without mutating the base", () => {
    expect(
      resolve("2026-09-08").entries.find((e) => e.prayer === "isha")?.localTime,
    ).toBe("20:45");
    expect(
      resolve("2026-09-09").entries.find((e) => e.prayer === "isha")?.localTime,
    ).toBe("20:30");
    expect(base.entries.find((e) => e.prayer === "isha")?.localTime).toBe(
      "20:30",
    );
  });
  it("includes multiple Friday sessions only on Friday", () => {
    expect(resolve("2026-09-11").jumuahSessions).toHaveLength(2);
    expect(resolve("2026-09-10").jumuahSessions).toHaveLength(0);
  });
  it("fails explicitly on ambiguous published periods", () => {
    expect(() =>
      resolve("2026-09-07", [base, { ...base, id: "another" }]),
    ).toThrow("overlap");
  });
});

describe("next Jamaat", () => {
  it("uses the mosque's timezone, independent of the visitor", () => {
    const next = getNextJamaat({
      mosqueTimezone: "Asia/Karachi",
      now: "2026-09-07T07:00:00Z",
      today: resolve("2026-09-07"),
      tomorrow: resolve("2026-09-08"),
    });
    expect(next).toMatchObject({
      prayer: "dhuhr",
      jamaatInstant: "2026-09-07T08:15:00Z",
      timeRemainingMs: 75 * 60000,
    });
    expect(mosqueLocalDate("2026-09-07T23:00:00Z", "Asia/Karachi")).toBe(
      "2026-09-08",
    );
    expect(mosqueLocalDate("2026-09-07T01:00:00Z", "America/New_York")).toBe(
      "2026-09-06",
    );
  });
  it("uses tomorrow's separately resolved Fajr including its override", () => {
    const changed = [
      {
        ...base,
        overrides: [
          {
            localDate: "2026-09-08",
            prayer: "fajr" as const,
            localTime: "05:45",
          },
        ],
      },
    ];
    const next = getNextJamaat({
      mosqueTimezone: "Asia/Karachi",
      now: "2026-09-07T18:00:00Z",
      today: resolve("2026-09-07", changed),
      tomorrow: resolve("2026-09-08", changed),
    });
    expect(next).toMatchObject({
      prayer: "fajr",
      jamaatInstant: "2026-09-08T00:45:00Z",
      date: "2026-09-08",
    });
  });
  it("does not fabricate tomorrow's Fajr after schedule expiry", () => {
    const expired = [{ ...base, effectiveTo: "2026-09-07" }];
    expect(
      getNextJamaat({
        mosqueTimezone: "Asia/Karachi",
        now: "2026-09-07T18:00:00Z",
        today: resolve("2026-09-07", expired),
        tomorrow: resolve("2026-09-08", expired),
      }),
    ).toBeNull();
  });
  it("selects the next Friday session and replaces Dhuhr", () => {
    const next = getNextJamaat({
      mosqueTimezone: "Asia/Karachi",
      now: "2026-09-11T08:20:00Z",
      today: resolve("2026-09-11"),
      tomorrow: resolve("2026-09-12"),
    });
    expect(next).toMatchObject({
      prayer: "jumuah",
      jamaatLocalTime: "14:00",
      label: "Jumu’ah 2",
    });
  });
  it("includes a Jamaat at the exact current instant", () => {
    expect(
      getNextJamaat({
        mosqueTimezone: "Asia/Karachi",
        now: "2026-09-07T08:15:00Z",
        today: resolve("2026-09-07"),
        tomorrow: resolve("2026-09-08"),
      })?.timeRemainingMs,
    ).toBe(0);
  });
  it("rejects mismatched resolved dates", () => {
    expect(() =>
      getNextJamaat({
        mosqueTimezone: "Asia/Karachi",
        now: "2026-09-07T08:15:00Z",
        today: resolve("2026-09-06"),
        tomorrow: resolve("2026-09-08"),
      }),
    ).toThrow("Resolve today");
  });
  it("handles DST offsets, nonexistent times and repeated times explicitly", () => {
    expect(
      localJamaatInstant("2026-03-29", "01:30", "Europe/London"),
    ).toBeNull();
    expect(
      localJamaatInstant("2026-10-25", "01:30", "Europe/London")?.toString(),
    ).toBe("2026-10-25T00:30:00Z");
    expect(
      localJamaatInstant("2026-03-08", "02:30", "America/New_York"),
    ).toBeNull();
    expect(
      localJamaatInstant("2026-03-08", "05:30", "America/New_York")?.toString(),
    ).toBe("2026-03-08T09:30:00Z");
  });
});

describe("validation and permissions", () => {
  const draft = {
    mosqueId,
    effectiveFrom: base.effectiveFrom,
    effectiveTo: base.effectiveTo,
    entries: base.entries,
    jumuahSessions: base.jumuahSessions,
    overrides: base.overrides,
  };
  it("validates complete schedules, clock times and real dates", () => {
    expect(scheduleDraftSchema.safeParse(draft).success).toBe(true);
    expect(
      scheduleDraftSchema.safeParse({
        ...draft,
        entries: draft.entries.slice(1),
      }).success,
    ).toBe(false);
    expect(
      scheduleDraftSchema.safeParse({ ...draft, effectiveFrom: "2026-02-30" })
        .success,
    ).toBe(false);
    expect(
      scheduleDraftSchema.safeParse({
        ...draft,
        overrides: [
          { prayer: "isha", localTime: "24:01", localDate: "2030-01-01" },
        ],
      }).success,
    ).toBe(false);
    expect(timezoneSchema.safeParse("Europe/Berlin").success).toBe(true);
    expect(timezoneSchema.safeParse("Karachi").success).toBe(false);
  });
  it("bounds location queries and validates QR tokens", () => {
    expect(
      nearbyQuerySchema.safeParse({ latitude: 91, longitude: 0 }).success,
    ).toBe(false);
    expect(
      nearbyQuerySchema.safeParse({
        latitude: 0,
        longitude: 0,
        radiusMeters: 50001,
      }).success,
    ).toBe(false);
    expect(
      nearbyQuerySchema.safeParse({ latitude: NaN, longitude: 0 }).success,
    ).toBe(false);
    expect(qrCodeSchema.safeParse("../admin").success).toBe(false);
    expect(qrCodeSchema.safeParse("R3wN5Pv9g_xf-2cK8sjDaA").success).toBe(true);
  });
  it("requires the exact user, mosque, role and active membership", () => {
    const member = {
      userId: "user",
      mosqueId,
      role: "editor" as const,
      status: "active" as const,
    };
    expect(canManageMosque("user", mosqueId, member, "publish_schedule")).toBe(
      true,
    );
    expect(canManageMosque(null, mosqueId, member, "publish_schedule")).toBe(
      false,
    );
    expect(
      canManageMosque("stranger", mosqueId, member, "publish_schedule"),
    ).toBe(false);
    expect(
      canManageMosque("user", "another-mosque", member, "publish_schedule"),
    ).toBe(false);
    expect(
      canManageMosque(
        "user",
        mosqueId,
        { ...member, status: "suspended" },
        "publish_schedule",
      ),
    ).toBe(false);
  });
});
