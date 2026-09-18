import { expect, it } from "vitest";
import { formatHijriDate } from "@/lib/hijri-date";

it("renders the Hijri month in Arabic", () => {
  const date = formatHijriDate("2026-09-18T01:00:00Z", "Asia/Karachi");
  expect(date).toMatch(/[\u0600-\u06ff]/);
  expect(date).not.toMatch(/[a-z]/i);
});

it("uses the mosque-local calendar day, not the visitor timezone", () => {
  expect(formatHijriDate("2026-09-17T20:00:00Z", "Asia/Karachi")).toBe(
    formatHijriDate("2026-09-18T01:00:00Z", "UTC"),
  );
  expect(formatHijriDate("2026-09-17T20:00:00Z", "Asia/Karachi")).not.toBe(
    formatHijriDate("2026-09-17T20:00:00Z", "UTC"),
  );
});
