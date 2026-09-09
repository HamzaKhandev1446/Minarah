import { z } from "zod";
import { PRAYERS, type JamaatSchedule, type Mosque } from "@/domain/types";
import { timezoneSchema } from "@/domain/validation";

const mosqueRow = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  address_line: z.string(),
  locality: z.string(),
  city: z.string(),
  country_code: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timezone: timezoneSchema,
  verification_status: z.enum(["unverified", "pending", "verified"]),
  is_synthetic: z.boolean(),
});
const clock = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:00)?$/)
  .transform((value) => value.slice(0, 5));
const entry = z.object({ prayer: z.enum(PRAYERS), local_time: clock });
const scheduleRow = z.object({
  id: z.uuid(),
  mosque_id: z.uuid(),
  effective_from: z.string(),
  effective_to: z.string(),
  status: z.literal("published"),
  revision: z.number(),
  published_at: z.string(),
  jamaat_schedule_entries: z.array(entry),
  jumuah_sessions: z.array(
    z.object({
      position: z.number(),
      local_time: clock,
      label: z.string().nullable(),
    }),
  ),
  schedule_overrides: z.array(entry.extend({ local_date: z.string() })),
});

export function mapMosque(value: unknown): Mosque {
  const row = mosqueRow.parse(value);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    addressLine: row.address_line,
    locality: row.locality,
    city: row.city,
    countryCode: row.country_code,
    latitude: row.latitude,
    longitude: row.longitude,
    timezone: row.timezone,
    verificationStatus: row.verification_status,
    isSynthetic: row.is_synthetic,
  };
}
export function mapSchedule(value: unknown): JamaatSchedule {
  return convertSchedule(scheduleRow.parse(value));
}
const adminScheduleRow = scheduleRow.extend({
  status: z.enum(["draft", "published", "archived"]),
  published_at: z.string().nullable(),
});
export function mapAdminSchedule(value: unknown): JamaatSchedule {
  return convertSchedule(adminScheduleRow.parse(value));
}
function convertSchedule(
  row: z.infer<typeof adminScheduleRow>,
): JamaatSchedule {
  return {
    id: row.id,
    mosqueId: row.mosque_id,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    status: row.status,
    revision: row.revision,
    publishedAt: row.published_at,
    entries: row.jamaat_schedule_entries
      .map((e) => ({
        prayer: e.prayer,
        localTime: e.local_time,
      }))
      .sort((a, b) => PRAYERS.indexOf(a.prayer) - PRAYERS.indexOf(b.prayer)),
    jumuahSessions: row.jumuah_sessions
      .map((j) => ({
        position: j.position,
        localTime: j.local_time,
        label: j.label,
      }))
      .sort((a, b) => a.position - b.position),
    overrides: row.schedule_overrides
      .map((o) => ({
        prayer: o.prayer,
        localTime: o.local_time,
        localDate: o.local_date,
      }))
      .sort(
        (a, b) =>
          a.localDate.localeCompare(b.localDate) ||
          a.prayer.localeCompare(b.prayer),
      ),
  };
}
