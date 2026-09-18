import Link from "next/link";
import { MosqueRegistration } from "@/components/mosque-registration";
import { getSupabaseConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { placeSchema } from "@/lib/place-search";
export const dynamic = "force-dynamic";
export default async function RegisterMosque({
  searchParams,
}: {
  searchParams: Promise<{ mosque?: string; lat?: string; lng?: string }>;
}) {
  const { mosque, lat, lng } = await searchParams;
  const candidate = placeSchema.safeParse({
    latitude: lat?.trim() ? Number(lat) : NaN,
    longitude: lng?.trim() ? Number(lng) : NaN,
  });
  const initialPlace = candidate.success ? candidate.data : undefined;
  const configured = !!getSupabaseConfig();
  let email: string | null = null;
  let ready = false;
  if (configured) {
    try {
      const db = await createClient();
      const { data } = await db.auth.getUser();
      email = data.user?.email || null;
      if (email) {
        const { error } = await db
          .from("mosque_registrations")
          .select("submission_id,sect,sub_sect")
          .limit(0);
        ready = !error;
      }
    } catch {
      /* The public location picker stays available during connection failures. */
    }
  }
  const slug =
    mosque && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(mosque) && mosque.length <= 160
      ? mosque
      : null;
  return (
    <main
      id="main"
      className="detail-shell registration-intro registration-page"
    >
      <div className="registration-page-heading">
        <p className="eyebrow">Your community, connected</p>
        <h1>Register your mosque</h1>
        <p>A few details. A closer community.</p>
      </div>
      <MosqueRegistration
        key={
          initialPlace
            ? `${initialPlace.latitude}:${initialPlace.longitude}`
            : "default"
        }
        email={email}
        configured={configured}
        ready={ready}
        initialPlace={initialPlace}
      />
      <div className="registration-other-options">
        {slug && (
          <article>
            <h2>Claim this listed mosque</h2>
            <p>
              If you represent this mosque, submit your authority for review
              before managing its timetable.
            </p>
            <Link className="button" href={`/mosques/${slug}/claim`}>
              Claim this mosque
            </Link>
          </article>
        )}
        <p>
          Already registered? <Link href="/admin">Manage mosque</Link>
        </p>
        <details>
          <summary>Not a mosque representative?</summary>
          <p>
            You can suggest a directory listing without requesting management
            access. <Link href="/submit">Add Mosque</Link>
          </p>
        </details>
      </div>
    </main>
  );
}
