import { z } from "zod";
import {
  coordinatesSchema,
  localDateSchema,
  localTimeSchema,
  timezoneSchema,
} from "@/domain/validation";
import { PRAYERS } from "@/domain/types";
import type { DiscoveryResponse } from "@/domain/discovery";

const entry = z.object({ prayer: z.enum(PRAYERS), localTime: localTimeSchema });
const publishedSchedule = z.object({
  id: z.uuid(),
  mosqueId: z.uuid(),
  effectiveFrom: localDateSchema,
  effectiveTo: localDateSchema.nullable(),
  status: z.literal("published"),
  revision: z.number().int().positive(),
  publishedAt: z.string(),
  entries: z.array(entry),
  jumuahSessions: z.array(
    z.object({
      position: z.number().int().positive(),
      localTime: localTimeSchema,
      label: z.string().nullable(),
    }),
  ),
  overrides: z.array(entry.extend({ localDate: localDateSchema })),
});

/** Validate the HTTP boundary before untrusted payloads reach time/location UI. */
export const discoveryResponseSchema = z.object({
  results: z.array(
    z.object({
      mosque: coordinatesSchema.extend({
        id: z.uuid(),
        slug: z.string(),
        name: z.string(),
        addressLine: z.string(),
        locality: z.string(),
        city: z.string(),
        countryCode: z.string(),
        timezone: timezoneSchema,
        verificationStatus: z.enum([
          "unverified",
          "pending",
          "verified",
          "rejected",
        ]),
        isSynthetic: z.boolean(),
      }),
      schedules: z.array(publishedSchedule),
      distanceMeters: z.number().finite().nonnegative().nullable(),
    }),
  ),
  fetchedAt: z.iso.datetime({ offset: true }),
  radiusMeters: z.number().finite().positive(),
}) satisfies z.ZodType<DiscoveryResponse>;
