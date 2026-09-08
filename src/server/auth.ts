import "server-only";
import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/config";
export async function requireUser() {
  if (!getSupabaseConfig()) redirect("/auth/login?setup=1");
  const db = await createClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) redirect("/auth/login");
  return { db, user: data.user };
}
export async function requireMember(mosqueId: string) {
  if (!z.uuid().safeParse(mosqueId).success) notFound();
  const session = await requireUser();
  const { data, error } = await session.db.rpc("can_manage_mosque", {
    target_mosque: mosqueId,
  });
  if (error || data !== true) notFound();
  return session;
}
export async function requirePlatformAdmin() {
  const session = await requireUser();
  const { data, error } = await session.db.rpc("is_platform_admin");
  if (error || data !== true) notFound();
  return session;
}
