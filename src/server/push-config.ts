import "server-only";
import { createClient } from "@supabase/supabase-js";

export function pushConfigured() {
  return (
    process.env.PUSH_ENABLED === "1" &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !!process.env.VAPID_PUBLIC_KEY &&
    !!process.env.VAPID_PRIVATE_KEY &&
    !!process.env.VAPID_SUBJECT &&
    !!process.env.CRON_SECRET
  );
}
export function pushDatabase() {
  if (!pushConfigured()) throw new Error("Push is not configured");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
