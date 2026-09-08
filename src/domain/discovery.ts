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
    next: getNextJamaat({
      mosqueTimezone: result.mosque.timezone,
      now,
      today,
      tomorrow,
    }),
    fridaySessions: base?.jumuahSessions ?? [],
  };
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
