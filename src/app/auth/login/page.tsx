import Link from "next/link";
import { AuthForm } from "@/features/account/components/auth-form";
import { getSupabaseConfig } from "@/lib/config";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const configured = Boolean(getSupabaseConfig());
  const error = (await searchParams).error;
  return (
    <main id="main" className="detail-shell">
      <h1>Mosque administration</h1>
      <p>
        Sign in to manage a mosque you’re authorized to represent. You never
        need an account to browse or follow a mosque.
      </p>
      {!configured && (
        <p className="notice">
          Live accounts are not connected yet. Configure Supabase to enable
          sign-in.
        </p>
      )}
      <AuthForm configured={configured} />
      {error === "confirmation" && (
        <p role="alert" className="notice error">
          This confirmation link could not be used. It may have expired or
          already been used. Try signing in if your email is confirmed;
          otherwise request a new confirmation email.
        </p>
      )}
      <p>
        <Link href="/">Find mosques</Link> ·{" "}
        <Link href="/?mode=demo">Explore the demo</Link>
      </p>
    </main>
  );
}
