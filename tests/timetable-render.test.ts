import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { NearbyMosqueList } from "@/features/discovery/components/nearby-mosque-list";
import { getSampleData } from "@/data/sample";
import { LIVE_JAMAAT_LABEL } from "@/domain/timetable";

it("renders all six public timetable cells, Friday badge and Arabic live text", () => {
  const now = "2026-09-18T08:45:00Z";
  const sample = getSampleData(now);
  const mosque = sample.mosques[0]!;
  const html = renderToStaticMarkup(
    createElement(NearbyMosqueList, {
      results: [
        {
          mosque,
          distanceMeters: 40,
          schedules: [
            {
              ...sample.schedules[0]!,
              jumuahSessions: [
                { position: 1, label: "Jumuah", localTime: "13:45" },
              ],
            },
          ],
        },
      ],
      now,
      mode: "demo",
      selectedId: mosque.id,
      onSelect: () => {},
    }),
  );
  expect(html.match(/class="jamaat-time-cell /g)).toHaveLength(6);
  expect(html).toContain('class="jummah-badge">Jummah</small>');
  expect(html).toContain(LIVE_JAMAAT_LABEL);
  expect(html).not.toContain("????");
  expect(html).not.toContain("Today is Jummah");
  expect(html).toContain(`/mosques/${mosque.slug}?mode=demo`);
  expect(html).toContain(`Add ${mosque.name} to favourites`);
});
