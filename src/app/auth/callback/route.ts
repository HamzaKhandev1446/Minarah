import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/server/qr";
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (code) {
    const db = await createClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/admin", siteOrigin()));
  }
  return NextResponse.redirect(
    new URL("/auth/login?error=confirmation", siteOrigin()),
  );
}
