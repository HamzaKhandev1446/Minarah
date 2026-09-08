import { z } from "zod";
import { coordinatesSchema, timezoneSchema } from "./validation";
export const submissionSchema = z.object({
  name: z.string().trim().min(2).max(160),
  addressLine: z.string().trim().min(2).max(300),
  city: z.string().trim().min(1).max(120),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  ...coordinatesSchema.shape,
  timezone: timezoneSchema,
  phone: z.string().max(40),
  website: z.union([
    z.literal(""),
    z
      .url()
      .max(500)
      .refine((value) => /^https?:\/\//.test(value)),
  ]),
  notes: z.string().max(2000),
});
export const claimSchema = z.object({
  mosqueId: z.uuid(),
  name: z.string().trim().min(2).max(120),
  contact: z.string().trim().min(3).max(250),
  role: z.string().trim().min(2).max(120),
  explanation: z.string().trim().min(10).max(2000),
  supporting: z.string().max(2000),
});
