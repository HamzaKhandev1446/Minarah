import { createHash, timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { z } from "zod";
import { pushConfigured, pushDatabase } from "@/server/push-config";
import { pushSubscriptionSchema } from "@/lib/push-contract";
import { notificationPreferencesSchema } from "@/lib/notification-preferences";
import { discoverMosques } from "@/server/mosques";
import { planMosquePush } from "@/domain/push-notifications";
import { reportOperationalEvent } from "@/server/operational-events";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
const deviceSchema = z.object({
  id: z.uuid(),
  lease_id: z.uuid(),
  subscription: pushSubscriptionSchema,
  mosque_ids: z.array(z.uuid()).max(50),
  preferences: notificationPreferencesSchema,
  delivery_state: z.record(
    z.string(),
    z.object({
      publication: z.string().optional(),
      reminder: z.string().optional(),
    }),
  ),
});

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization") || "";
  if (
    !secret ||
    !timingSafeEqual(
      createHash("sha256").update(provided).digest(),
      createHash("sha256").update(`Bearer ${secret}`).digest(),
    )
  )
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  if (!pushConfigured())
    return Response.json(
      { error: "Push is not configured" },
      { status: 503, headers },
    );
  const deadline = Date.now() + 45000;
  let sent = 0;
  let failed = 0;
  try {
    const db = pushDatabase();
    const cleanup = await db.from("device_push_subscriptions").delete().lt("expires_at", new Date().toISOString());
    if (cleanup.error) throw cleanup.error;
    const { data, error } = await db.rpc("claim_device_push", {
      batch_size: 20,
    });
    if (error) throw error;
    for (const raw of data ?? []) {
      if (Date.now() >= deadline) break;
      const device = deviceSchema.parse(raw);
      try {
        const response = await discoverMosques(
          { kind: "followed", ids: device.mosque_ids },
          "live",
        );
        const state = Object.fromEntries(
          Object.entries(device.delivery_state).filter(([id]) =>
            device.mosque_ids.includes(id),
          ),
        );
        for (const result of response.results) {
          if (Date.now() >= deadline) break;
          // Preference updates invalidate the lease; stop sending against older settings.
          const active = await db
            .from("device_push_subscriptions")
            .select("id")
            .eq("id", device.id)
            .eq("lease_id", device.lease_id)
            .maybeSingle();
          if (active.error || !active.data) break;
          const plan = planMosquePush(
            result,
            new Date().toISOString(),
            device.preferences,
            state[result.mosque.id],
          );
          for (const message of plan.messages) {
            await webpush.sendNotification(
              device.subscription,
              JSON.stringify(message),
              {
                TTL: message.ttl,
                timeout: 4000,
                vapidDetails: {
                  subject: process.env.VAPID_SUBJECT!,
                  publicKey: process.env.VAPID_PUBLIC_KEY!,
                  privateKey: process.env.VAPID_PRIVATE_KEY!,
                },
              },
            );
            sent++;
          }
          state[result.mosque.id] = plan.cursor;
          const update = await db
            .from("device_push_subscriptions")
            .update({ delivery_state: state })
            .eq("id", device.id)
            .eq("lease_id", device.lease_id);
          if (update.error) throw update.error;
        }
        await db
          .from("device_push_subscriptions")
          .update({ lease_until: null, lease_id: null })
          .eq("id", device.id)
          .eq("lease_id", device.lease_id);
      } catch (failure) {
        failed++;
        if (
          failure &&
          typeof failure === "object" &&
          "statusCode" in failure &&
          [404, 410].includes(Number(failure.statusCode))
        )
          await db
            .from("device_push_subscriptions")
            .delete()
            .eq("id", device.id)
            .eq("lease_id", device.lease_id);
        reportOperationalEvent("push_dispatch_failed");
      }
    }
    return Response.json({ sent, failed }, { headers });
  } catch {
    reportOperationalEvent("push_dispatch_failed");
    return Response.json(
      { error: "Dispatch unavailable" },
      { status: 503, headers },
    );
  }
}
