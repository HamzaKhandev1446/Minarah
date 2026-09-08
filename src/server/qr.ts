import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseConfig } from "@/lib/config";
import { qrCodeSchema } from "@/domain/validation";
import pilot from "@/data/pilot.json";

export function demoQrCode(slug: string) {
  return createHash("sha256")
    .update(`minarah-demo:${slug}`)
    .digest("base64url")
    .slice(0, 22);
}
export function siteOrigin() {
  const url = new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  );
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Invalid site URL.");
  return url.origin;
}
export async function resolveQr(
  code: string,
  demo: boolean,
): Promise<{
  status: "active" | "disabled" | "invalid";
  mosque_slug: string | null;
}> {
  if (!qrCodeSchema.safeParse(code).success)
    return { status: "invalid", mosque_slug: null };
  if (demo) {
    const mosque = pilot.find((m) => demoQrCode(m.slug) === code);
    return {
      status: mosque ? "active" : "invalid",
      mosque_slug: mosque?.slug ?? null,
    };
  }
  const config = getSupabaseConfig();
  if (!config) throw new Error("Live mosque information is not connected.");
  const client = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        }),
    },
  });
  const { data, error } = await client.rpc("resolve_qr", { qr_code: code });
  if (error) throw new Error("QR resolution is temporarily unavailable.");
  return (
    z
      .array(
        z.object({
          status: z.enum(["active", "disabled", "invalid"]),
          mosque_slug: z.string().nullable(),
        }),
      )
      .parse(data)[0] ?? { status: "invalid", mosque_slug: null }
  );
}
