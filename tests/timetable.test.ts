import { describe, expect, it } from "vitest";
import { getSampleData } from "@/data/sample";
import { mosqueTimetable, LIVE_JAMAAT_LABEL } from "@/domain/timetable";
import type { MosqueResult } from "@/domain/discovery";

const sample = getSampleData("2026-09-18T00:00:00Z");
const result: MosqueResult = {
  mosque: sample.mosques[0]!,
  distanceMeters: 25,
  schedules: [
    {
      ...sample.schedules[0]!,
      entries: sample.schedules[0]!.entries.map((entry) =>
        entry.prayer === "dhuhr" ? { ...entry, localTime: "13:15" } : entry,
      ),
      jumuahSessions: [{ position: 1, label: "Jumuah", localTime: "13:45" }],
    },
  ],
};

describe("locked public timetable behavior", () => {
  it.each([
    "2026-09-17T08:45:00Z",
    "2026-09-18T08:45:00Z",
    "2026-09-19T08:45:00Z",
  ])("keeps six ordered entries on %s", (now) => {
    expect(
      mosqueTimetable(result, now).columns.map((column) => column.key),
    ).toEqual(["fajr", "dhuhr", "asr", "maghrib", "isha", "jumuah"]);
  });
  it("shows Friday time beneath Dhuhr without removing the final Jumuah entry", () => {
    const model = mosqueTimetable(result, "2026-09-18T08:45:00Z");
    expect(model.columns[1]).toMatchObject({
      key: "dhuhr",
      isFridayDhuhr: true,
      localTime: "13:45",
      state: "live",
    });
    expect(model.columns[5]).toMatchObject({
      key: "jumuah",
      localTime: "13:45",
      state: "live",
    });
    expect(model.next?.prayer).toBe("jumuah");
    expect(model.activeColumn?.key).toBe("jumuah");
  });
  it("keeps normal Dhuhr and inactive Jumuah reference times on other days", () => {
    const model = mosqueTimetable(result, "2026-09-17T08:45:00Z");
    expect(model.columns[1]).toMatchObject({
      localTime: "13:15",
      isFridayDhuhr: false,
    });
    expect(model.columns[5]).toMatchObject({
      localTime: "13:45",
      state: null,
      isEmphasized: false,
    });
  });
  it("does not invent times when no schedule is published", () => {
    const model = mosqueTimetable(
      { ...result, schedules: [] },
      "2026-09-18T08:45:00Z",
    );
    expect(model.columns).toHaveLength(6);
    expect(
      model.columns.every(
        (column) => column.localTime === null && column.state === null,
      ),
    ).toBe(true);
    expect(model.next).toBeNull();
  });
  it("preserves Arabic live text", () => {
    expect(LIVE_JAMAAT_LABEL).toBe("قَدْ قَامَتِ الصَّلَاةُ");
    expect(LIVE_JAMAAT_LABEL).not.toContain("?");
  });
});
