import {
  currentSchedule,
  jamaatTimingState,
  type MosqueResult,
} from "./discovery";
import { localJamaatInstant } from "./schedule";

export const LIVE_JAMAAT_LABEL = "قَدْ قَامَتِ الصَّلَاةُ";

export const PRAYER_COLUMNS = [
  { key: "fajr", arabic: "فجر", english: "Fajr" },
  { key: "dhuhr", arabic: "ظهر", english: "Dhuhr" },
  { key: "asr", arabic: "عصر", english: "Asr" },
  { key: "maghrib", arabic: "مغرب", english: "Maghrib" },
  { key: "isha", arabic: "عشاء", english: "Isha" },
  { key: "jumuah", arabic: "جمعة", english: "Jumuah" },
] as const;

/** Six persistent display columns; Friday replacement never creates a Dhuhr event. */
export function mosqueTimetable(result: MosqueResult, now: string) {
  const schedule = currentSchedule(result, now);
  const { today, next, fridaySessions, publishedJumuahSessions } = schedule;
  const entries = new Map(today.entries.map((entry) => [entry.prayer, entry]));
  const jumuah = publishedJumuahSessions[0] ?? null;
  const stateFor = (localTime: string | undefined) =>
    jamaatTimingState(
      localTime
        ? (localJamaatInstant(
            today.localDate,
            localTime,
            result.mosque.timezone,
          )?.toString() ?? null)
        : null,
      now,
    );
  const activeColumn = PRAYER_COLUMNS.find((column) => {
    if (column.key === "jumuah" && fridaySessions.length === 0) return false;
    return (
      stateFor(
        column.key === "jumuah"
          ? jumuah?.localTime
          : entries.get(column.key)?.localTime,
      ) !== null
    );
  });
  const nextColumn =
    next?.date === today.localDate
      ? PRAYER_COLUMNS.find((column) => column.key === next.prayer)
      : undefined;
  const emphasized = activeColumn ?? nextColumn;
  const highlightedState = activeColumn
    ? stateFor(
        activeColumn.key === "jumuah"
          ? jumuah?.localTime
          : entries.get(activeColumn.key)?.localTime,
      )
    : null;
  const columns = PRAYER_COLUMNS.map((column) => {
    const isFridayDhuhr = column.key === "dhuhr" && fridaySessions.length > 0;
    const entry =
      column.key === "jumuah" || isFridayDhuhr
        ? jumuah
        : entries.get(column.key);
    return {
      ...column,
      localTime: entry?.localTime ?? null,
      isFridayDhuhr,
      state:
        column.key === "jumuah" && fridaySessions.length === 0
          ? null
          : stateFor(entry?.localTime),
      isEmphasized:
        emphasized?.key === column.key ||
        (isFridayDhuhr && emphasized?.key === "jumuah"),
    };
  });
  return { ...schedule, columns, activeColumn, highlightedState };
}
