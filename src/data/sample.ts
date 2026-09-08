import { Temporal } from "@js-temporal/polyfill";
import pilot from "./pilot.json";
import { PRAYERS, type JamaatSchedule, type Mosque } from "@/domain/types";

/** Explicit synthetic preview only. Production repositories must never fall back here. */
export function getSampleData(now: string): {
  mosques: Mosque[];
  schedules: JamaatSchedule[];
} {
  const date = Temporal.Instant.from(now)
    .toZonedDateTimeISO("Asia/Karachi")
    .toPlainDate();
  const mosques: Mosque[] = pilot.map((item, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    slug: item.slug,
    name: item.name,
    addressLine: `${index + 1} Example Lane`,
    locality: "Synthetic pilot",
    city: "Karachi",
    countryCode: "PK",
    latitude: item.latitude,
    longitude: item.longitude,
    timezone: "Asia/Karachi",
    verificationStatus: item.verified ? "verified" : "unverified",
    isSynthetic: true,
  }));
  const baseTimes = ["05:25", "13:15", "17:15", "18:45", "20:30"];
  const schedules: JamaatSchedule[] = mosques.map((mosque, index) => {
    const item = pilot[index]!;
    return {
      id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      mosqueId: mosque.id,
      effectiveFrom: date.with({ day: 1 }).subtract({ months: 1 }).toString(),
      effectiveTo: date
        .with({ day: 1 })
        .add({ months: 2 })
        .subtract({ days: 1 })
        .toString(),
      status: "published",
      revision: 1,
      publishedAt: date
        .subtract({ days: item.daysAgo })
        .toZonedDateTime({ timeZone: mosque.timezone, plainTime: "00:00" })
        .toInstant()
        .toString(),
      entries: PRAYERS.map((prayer, prayerIndex) => ({
        prayer,
        localTime: Temporal.PlainTime.from(baseTimes[prayerIndex]!)
          .add({ minutes: item.offset })
          .toString({ smallestUnit: "minute" }),
      })),
      jumuahSessions: Array.from(
        { length: item.sessions },
        (_, sessionIndex) => ({
          position: sessionIndex + 1,
          label: null,
          localTime: Temporal.PlainTime.from("13:15")
            .add({ minutes: sessionIndex * 45 })
            .toString({ smallestUnit: "minute" }),
        }),
      ),
      overrides:
        index === 0
          ? [
              {
                localDate: date.add({ days: 1 }).toString(),
                prayer: "isha",
                localTime: "20:45",
              },
            ]
          : [],
    };
  });
  return { mosques, schedules };
}
