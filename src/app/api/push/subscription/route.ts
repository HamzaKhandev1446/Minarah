import { createHash } from "node:crypto";
import { pushConfigured, pushDatabase } from "@/server/push-config";
import {
  pushRegistrationSchema,
  pushIdentitySchema,
} from "@/lib/push-contract";
import { reportOperationalEvent } from "@/server/operational-events";
import { siteOrigin } from "@/lib/site-origin";

const headers = { "Cache-Control": "private, no-store" };
export function GET() {
  return Response.json(
    {
      available: pushConfigured(),
      publicKey: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : null,
    },
    { headers },
  );
}
async function change(request: Request, remove: boolean) {
  if (!pushConfigured())
    return Response.json(
      { error: "Background alerts are not connected yet." },
      { status: 503, headers },
    );
  if (request.headers.get("origin") !== siteOrigin())
    return Response.json({ error: "Invalid origin" }, { status: 403, headers });
  try {
    const raw = await request.text();
    if (raw.length > 16384)
      return Response.json(
        { error: "Request too large" },
        { status: 413, headers },
      );
    const parsed = (
      remove ? pushIdentitySchema : pushRegistrationSchema
    ).safeParse(JSON.parse(raw));
    if (!parsed.success)
      return Response.json(
        { error: "Invalid device subscription" },
        { status: 400, headers },
      );
    const db = pushDatabase();
    const tokenHash = createHash("sha256")
      .update(parsed.data.token)
      .digest("hex");
    if (remove) {
      const { error } = await db
        .from("device_push_subscriptions")
        .delete()
        .eq("id", parsed.data.id)
        .eq("token_hash", tokenHash);
      if (error) throw error;
    } else {
      const data = pushRegistrationSchema.parse(parsed.data);
      const { error } = await db.rpc("save_device_push", {
        device_id: data.id,
        device_token_hash: tokenHash,
        push_subscription: data.subscription,
        followed_ids: data.mosqueIds,
        device_preferences: data.preferences,
      });
      if (error) throw error;
    }
    return Response.json({ ok: true }, { headers });
  } catch {
    reportOperationalEvent("push_subscription_failed");
    return Response.json(
      { error: "Could not update background alerts. Please try again." },
      { status: 400, headers },
    );
  }
}
export const POST = (request: Request) => change(request, false);
export const DELETE = (request: Request) => change(request, true);
