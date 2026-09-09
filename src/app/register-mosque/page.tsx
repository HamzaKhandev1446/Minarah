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
    <main id="main" className="detail-shell registration-intro">
      <p className="eyebrow">For mosque representatives</p>
      <h1>Register your mosque</h1>
      <p>
        Bring your mosque’s Jamaat timetable to your community. Register
        yourself as its representative and nominate up to two moderators.
      </p>
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
      <div className="admin-list">
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
        <article>
          <h2>Already registered?</h2>
          <p>
            Owners and approved moderators can sign in to their mosque’s
            timetable.
          </p>
          <Link className="button secondary" href="/admin">
            Manage mosque
          </Link>
        </article>
        <article>
          <h2>Add a missing mosque</h2>
          <p>
            Suggest a missing mosque for the directory without requesting
            management access.
          </p>
          <Link href="/submit">Add Mosque</Link>
        </article>
      </div>
      <p>
        <Link href="/?view=map">Find an existing mosque to claim</Link>
      </p>
    </main>
  );
}
