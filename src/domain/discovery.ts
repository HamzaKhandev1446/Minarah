import { z } from "zod";
import { Temporal } from "@js-temporal/polyfill";
import { coordinatesSchema } from "./validation";
import {
  getNextJamaat,
  mosqueLocalDate,
  resolveMosqueSchedule,
} from "./schedule";
import type { JamaatSchedule, Mosque } from "./types";

export const discoveryQuerySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("nearby"), ...coordinatesSchema.shape }),
  z.object({
    kind: z.literal("search"),
    query: z.string().trim().min(2).max(120),
  }),
  z.object({ kind: z.literal("followed"), ids: z.array(z.uuid()).max(50) }),
  z.object({
    kind: z.literal("detail"),
    coordinates: coordinatesSchema.optional(),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .max(160),
  }),
]);
export type DiscoveryQuery = z.infer<typeof discoveryQuerySchema>;
export type DataMode = "live" | "demo";
export interface MosqueResult {
  mosque: Mosque;
  schedules: JamaatSchedule[];
  distanceMeters: number | null;
}
export interface DiscoveryResponse {
  results: MosqueResult[];
  fetchedAt: string;
  radiusMeters: number;
}

export type JamaatTimingState = "nearly" | "live" | "recent" | null;

/**
 * Visual timing guidance for a published Jamaat. The boundary is deliberately
 * narrow: ten minutes before starts green, the first five minutes are red,
 * and minutes five through seven remain green as a recent start.
 */
export function jamaatTimingState(
  jamaatInstant: string | null,
  now: string,
): JamaatTimingState {
  if (!jamaatInstant) return null;
  const difference = Date.parse(jamaatInstant) - Date.parse(now);
  if (difference > 0 && difference <= 10 * 60_000) return "nearly";
  if (difference <= 0 && difference >= -5 * 60_000) return "live";
  if (difference < -5 * 60_000 && difference >= -7 * 60_000) return "recent";
  return null;
}

export function currentSchedule(result: MosqueResult, now: string) {
  const date = mosqueLocalDate(now, result.mosque.timezone);
  const today = resolveMosqueSchedule({
    mosqueId: result.mosque.id,
    localDate: date,
    schedules: result.schedules,
  });
  const tomorrow = resolveMosqueSchedule({
    mosqueId: result.mosque.id,
    localDate: Temporal.PlainDate.from(date).add({ days: 1 }).toString(),
    schedules: result.schedules,
  });
  const base = result.schedules.find(
    (schedule) => schedule.id === today.scheduleId,
  );
  return {
    today,
    // Timetable reference is visible every day; timing eligibility stays Friday-only.
    publishedJumuahSessions: [...(base?.jumuahSessions ?? [])].sort(
      (a, b) => a.position - b.position,
    ),
    next: getNextJamaat({
      mosqueTimezone: result.mosque.timezone,
      now,
      today,
      tomorrow,
    }),
    fridaySessions:
      Temporal.PlainDate.from(date).dayOfWeek === 5
        ? (base?.jumuahSessions ?? [])
        : [],
  };
}

export function formatPublishedAt(
  value: string | null | undefined,
  timezone: string,
) {
  if (!value) return "No current schedule published";
  const date = Temporal.Instant.from(value).toZonedDateTimeISO(timezone);
  const day = date.day;
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? "th"
      : ({ 1: "st", 2: "nd", 3: "rd" }[day % 10] ?? "th");
  const month = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    timeZone: timezone,
  }).format(new Date(value));
  const minutes = date.minute ? `:${String(date.minute).padStart(2, "0")}` : "";
  return `Last updated: ${day}${suffix} ${month} ${date.hour % 12 || 12}${minutes} ${date.hour >= 12 ? "pm" : "am"}`;
}

export function remainingLabel(milliseconds: number) {
  const minutes = Math.ceil(Math.max(0, milliseconds) / 60000);
  if (!minutes) return "Now";
  return minutes < 60
    ? `In ${minutes} min`
    : `In ${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
}

export function locationErrorMessage(code: number) {
  if (code === 1)
    return "Location permission was denied. You can search by mosque name or city.";
  if (code === 3)
    return "Finding your location timed out. Try again or search manually.";
  return "Your position is unavailable. Try again or search manually.";
}
