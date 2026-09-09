import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/site-origin";
export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const code = search.get("code");
  const tokenHash = search.get("token_hash");
  const origin = siteOrigin();
  const next =
    search.get("next") === "/register-mosque" ? "/register-mosque" : "/admin";
  let confirmed = false;
  try {
    if (code || (tokenHash && search.get("type") === "email")) {
      const db = await createClient();
      const { error } = code
        ? await db.auth.exchangeCodeForSession(code)
        : await db.auth.verifyOtp({ token_hash: tokenHash!, type: "email" });
      confirmed = !error;
    }
  } catch {
    // Expired links, missing PKCE cookies and network failures share recovery UI.
  }
  const response = NextResponse.redirect(
    new URL(confirmed ? next : "/auth/login?error=confirmation", origin),
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
