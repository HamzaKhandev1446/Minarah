import { z } from "zod";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url && !key) return null;
  return { url: z.url().parse(url), key: z.string().min(1).parse(key) };
}

export function getNearbyRadiusMeters(): number {
  const configured = z.coerce
    .number()
    .int()
    .min(100)
    .parse(process.env.NEARBY_RADIUS_METERS || 800);
  return Math.min(configured, 800);
}
