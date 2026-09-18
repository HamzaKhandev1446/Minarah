import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";
import { PRAYERS } from "./types";

export const localTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time (HH:mm).");
export const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    try {
      Temporal.PlainDate.from(value);
      return true;
    } catch {
      return false;
    }
  }, "Use a valid calendar date.");
export const timezoneSchema = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return !/^[+-]/.test(value);
  } catch {
    return false;
  }
}, "Use an IANA timezone.");
export const coordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});
export const nearbyQuerySchema = coordinatesSchema.extend({
  radiusMeters: z.number().int().min(100).max(800).default(800),
  limit: z.number().int().min(1).max(50).default(20),
});
export const qrCodeSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{16,32}$/, "Invalid QR code.");
const entrySchema = z.object({
  prayer: z.enum(PRAYERS),
  localTime: localTimeSchema,
});
export const scheduleDraftSchema = z
  .object({
    mosqueId: z.uuid(),
    effectiveFrom: localDateSchema,
    effectiveTo: localDateSchema.nullable(),
    entries: z
      .array(entrySchema)
      .length(5)
      .refine(
        (entries) => new Set(entries.map((entry) => entry.prayer)).size === 5,
        "Provide each of the five prayers exactly once.",
      ),
    jumuahSessions: z
      .array(
        z.object({
          position: z.number().int().min(1).max(10),
          localTime: localTimeSchema,
          label: z.string().trim().max(80).nullable(),
        }),
      )
      .max(10)
      .refine(
        (sessions) =>
          new Set(sessions.map((session) => session.position)).size ===
          sessions.length,
        "Session positions must be unique.",
      ),
    overrides: z
      .array(entrySchema.extend({ localDate: localDateSchema }))
      .max(500)
      .refine(
        (entries) =>
          new Set(entries.map((entry) => `${entry.localDate}:${entry.prayer}`))
            .size === entries.length,
        "Only one override per prayer and date is allowed.",
      ),
  })
  .superRefine((value, context) => {
    if (value.effectiveTo !== null && value.effectiveTo < value.effectiveFrom)
      context.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message: "End date must be on or after start date.",
      });
    value.overrides.forEach((override, index) => {
      if (
        override.localDate < value.effectiveFrom ||
        (value.effectiveTo !== null && override.localDate > value.effectiveTo)
      )
        context.addIssue({
          code: "custom",
          path: ["overrides", index, "localDate"],
          message:
            "Override must fall within this schedule's effective period.",
        });
    });
  });
