import { z } from "zod";
import { notificationPreferencesSchema } from "./notification-preferences";

export const pushIdentitySchema = z.object({
  id: z.uuid(),
  token: z.string().regex(/^[a-f0-9]{64}$/),
});
export const pushEndpointSchema = z.url().refine((value) => {
  const url = new URL(value);
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.port &&
    (url.hostname === "fcm.googleapis.com" ||
      url.hostname === "updates.push.services.mozilla.com" ||
      url.hostname === "web.push.apple.com" ||
      url.hostname.endsWith(".notify.windows.com"))
  );
}, "Unsupported browser push service");
export const pushSubscriptionSchema = z.object({
  endpoint: pushEndpointSchema,
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{80,100}$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{16,30}$/),
  }),
});
export const pushRegistrationSchema = pushIdentitySchema.extend({
  subscription: pushSubscriptionSchema,
  preferences: notificationPreferencesSchema,
  mosqueIds: z
    .array(z.uuid())
    .max(50)
    .transform((ids) => [...new Set(ids)]),
});
