"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/config";
import { siteOrigin } from "@/lib/site-origin";
export interface AuthState {
  message: string;
}
export async function authenticate(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  if (!getSupabaseConfig())
    return {
      message:
        "Authentication needs the Supabase connection. The public demo remains available.",
    };
  const parsed = z
    .object({
      email: z.email().max(254),
      password: z.string().max(128),
      intent: z.enum(["login", "register", "resend"]),
    })
    .refine((value) => value.intent === "resend" || value.password.length >= 8)
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      message: "Enter a valid email and a password of 8–128 characters.",
    };
  const next =
    form.get("next") === "/register-mosque" ? "/register-mosque" : "/admin";
  const callback = `${siteOrigin()}/auth/callback${next === "/register-mosque" ? "?next=/register-mosque" : ""}`;
  try {
    const db = await createClient();
    if (parsed.data.intent === "resend") {
      const { error } = await db.auth.resend({
        type: "signup",
        email: parsed.data.email,
        options: { emailRedirectTo: callback },
      });
      return {
        message: error
          ? "A confirmation email could not be requested. Please wait before trying again."
          : "If this address has an unconfirmed account, a new confirmation email has been requested. Check your inbox and spam folder.",
      };
    }
    if (parsed.data.intent === "register") {
      const { error } = await db.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { emailRedirectTo: callback },
      });
      return {
        message: error
          ? "Registration could not be completed. Try again later or sign in if you already have an account."
          : "Check your email to confirm your account, then sign in. Registration does not grant mosque management access.",
      };
    }
    const { error } = await db.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error)
      return {
        message:
          "Sign-in failed. Check your email, password and account confirmation.",
      };
  } catch {
    return {
      message: "Authentication is temporarily unavailable. Please try again.",
    };
  }
  redirect(next);
}
export async function signOut() {
  const db = await createClient();
  const { error } = await db.auth.signOut();
  if (error) throw new Error("Sign-out failed. Please try again.");
  redirect("/auth/login");
}
