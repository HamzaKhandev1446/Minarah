import { Temporal } from "@js-temporal/polyfill";
import type { JamaatSchedule, NextJamaat, ResolvedSchedule } from "./types";
import { localDateSchema } from "./validation";

export const PRAYER_LABELS = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
  jumuah: "Jumu’ah",
} as const;

export function mosqueLocalDate(now: string, timezone: string): string {
  return Temporal.Instant.from(now)
    .toZonedDateTimeISO(timezone)
    .toPlainDate()
    .toString();
}

export function resolveMosqueSchedule({
  mosqueId,
  localDate,
  schedules,
}: {
  mosqueId: string;
  localDate: string;
  schedules: readonly JamaatSchedule[];
}): ResolvedSchedule {
  localDateSchema.parse(localDate);
  const applicable = schedules.filter(
    (schedule) =>
      schedule.mosqueId === mosqueId &&
      schedule.status === "published" &&
      schedule.effectiveFrom <= localDate &&
      (schedule.effectiveTo === null || schedule.effectiveTo >= localDate),
  );
  if (applicable.length > 1)
    throw new Error("Published schedule periods overlap.");
  const base = applicable[0];
  if (!base)
    return {
      mosqueId,
      localDate,
      scheduleId: null,
      publishedAt: null,
      entries: [],
      jumuahSessions: [],
    };
  const overrides = base.overrides.filter(
    (override) => override.localDate === localDate,
  );
  const replacesDhuhr =
    Temporal.PlainDate.from(localDate).dayOfWeek === 5 &&
    base.jumuahSessions.length > 0;
  return {
    mosqueId,
    localDate,
    scheduleId: base.id,
    publishedAt: base.publishedAt,
    entries: base.entries
      .filter((entry) => !(replacesDhuhr && entry.prayer === "dhuhr"))
      .map((entry) => ({
        ...entry,
        localTime:
          overrides.find((override) => override.prayer === entry.prayer)
            ?.localTime ?? entry.localTime,
      })),
    jumuahSessions:
      Temporal.PlainDate.from(localDate).dayOfWeek === 5
        ? [...base.jumuahSessions].sort((a, b) => a.position - b.position)
        : [],
  };
}

/** DST policy: use the earlier occurrence in a fold; skip nonexistent local times.
 * Never shift a mosque's published clock time silently during a DST gap. */
export function localJamaatInstant(
  date: string,
  time: string,
  timezone: string,
): Temporal.Instant | null {
  const clock = Temporal.PlainDateTime.from(`${date}T${time}`);
  const zoned = clock.toZonedDateTime(timezone, { disambiguation: "earlier" });
  return zoned.toPlainDateTime().equals(clock) ? zoned.toInstant() : null;
}

export function getNextJamaat({
  mosqueTimezone,
  now,
  today,
  tomorrow,
}: {
  mosqueTimezone: string;
  now: string;
  today: ResolvedSchedule;
  tomorrow: ResolvedSchedule;
}): NextJamaat | null {
  const instant = Temporal.Instant.from(now);
  const localDate = mosqueLocalDate(now, mosqueTimezone);
  if (
    today.localDate !== localDate ||
    tomorrow.localDate !==
      Temporal.PlainDate.from(localDate).add({ days: 1 }).toString() ||
    today.mosqueId !== tomorrow.mosqueId
  )
    throw new Error(
      "Resolve today and tomorrow for the same mosque before finding the next Jamaat.",
    );
  const candidates = [
    ...today.entries
      .filter(
        (entry) =>
          !(entry.prayer === "dhuhr" && today.jumuahSessions.length > 0),
      )
      .map((entry) => ({
        ...entry,
        date: today.localDate,
        label: PRAYER_LABELS[entry.prayer],
      })),
    ...today.jumuahSessions.map((session) => ({
      prayer: "jumuah" as const,
      localTime: session.localTime,
      date: today.localDate,
      label: session.label || `Jumu’ah ${session.position}`,
    })),
    ...tomorrow.entries
      .filter((entry) => entry.prayer === "fajr")
      .map((entry) => ({ ...entry, date: tomorrow.localDate, label: "Fajr" })),
  ]
    .flatMap((candidate) => {
      const at = localJamaatInstant(
        candidate.date,
        candidate.localTime,
        mosqueTimezone,
      );
      if (!at || Temporal.Instant.compare(at, instant) < 0) return [];
      return [
        {
          prayer: candidate.prayer,
          label: candidate.label,
          jamaatLocalTime: candidate.localTime,
          jamaatInstant: at.toString(),
          date: candidate.date,
          timeRemainingMs: at.epochMilliseconds - instant.epochMilliseconds,
        },
      ];
    })
    .sort((a, b) => a.timeRemainingMs - b.timeRemainingMs);
  return candidates[0] ?? null;
}

export function formatClockTime(time: string): string {
  const parsed = Temporal.PlainTime.from(time);
  return `${parsed.hour % 12 || 12}:${String(parsed.minute).padStart(2, "0")} ${parsed.hour < 12 ? "AM" : "PM"}`;
}
