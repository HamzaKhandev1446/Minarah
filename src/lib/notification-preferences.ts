import { z } from "zod";

export const NOTIFICATION_KEY = "minarah:notifications:v1";
export const notificationPreferencesSchema = z.object({
  enabled: z.boolean().default(false),
  reminders: z.boolean().default(true),
  changes: z.boolean().default(true),
  minutes: z.union([z.literal(5), z.literal(10), z.literal(15)]).default(10),
});
export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;
export function readNotificationPreferences(
  raw: string | null,
): NotificationPreferences {
  try {
    return notificationPreferencesSchema.parse(JSON.parse(raw ?? "{}"));
  } catch {
    return notificationPreferencesSchema.parse({});
  }
}
