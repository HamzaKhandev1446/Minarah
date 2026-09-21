import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("@/app/admin/[mosqueId]/actions", () => ({ saveSchedule: vi.fn() }));
import { SchedulePreview } from "@/features/administration/components/schedule-preview";
import { ScheduleEditor } from "@/features/administration/components/schedule-editor";
import { getSampleData } from "@/data/sample";
const schedule = getSampleData("2026-09-19T00:00:00Z").schedules[0]!;
it("reviews daily, Friday and override times without creating a publication", () => {
  const html = renderToStaticMarkup(createElement(SchedulePreview, schedule));
  expect(html).toContain("Review your Jamaat times");
  expect(html).toContain("Friday Jumuah");
  expect(html).toContain("Date-specific changes");
  expect(html).toContain("Previous publications remain in the history");
});
it.each([false, true])("keeps drafts available and does not render a one-click publish submit (limited: %s)", limited => {
  const html = renderToStaticMarkup(createElement(ScheduleEditor, { mosqueId: schedule.mosqueId, initial: schedule, localDate: "2026-09-19", limited }));
  expect(html).toContain('value="save"');
  expect(html).not.toContain('value="publish"');
  expect(html).toContain("Preview &amp; publish");
});
