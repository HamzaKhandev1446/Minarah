import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { getSupabaseConfig } from "@/lib/config";
export const dynamic = "force-dynamic";
export default function Login() {
  const configured = Boolean(getSupabaseConfig());
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
      <p>
        <Link href="/">Find mosques</Link> ·{" "}
        <Link href="/?mode=demo">Explore the demo</Link>
      </p>
    </main>
  );
}
