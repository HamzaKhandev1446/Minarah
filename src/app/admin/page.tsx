import Link from "next/link";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { signOut } from "@/app/auth/actions";
import { NominationForm } from "@/components/nomination-form";
export const dynamic = "force-dynamic";
export default async function Admin() {
  const { db, user } = await requireUser();
  const { data, error } = await db
    .from("mosque_members")
    .select("role,mosques(id,name,slug)")
    .eq("user_id", user.id)
    .eq("status", "active");
  if (error) throw new Error("Your authorized mosques could not be loaded.");
  const memberships = z
    .array(
      z.object({
        role: z.string(),
        mosques: z
          .object({ id: z.uuid(), name: z.string(), slug: z.string() })
          .nullable(),
      }),
    )
    .parse(data);
  const { data: platform } = await db.rpc("is_platform_admin");
  const nominationsResult = await db.rpc("pending_moderator_nominations");
  const nominations = nominationsResult.error
    ? []
    : z
        .array(z.object({ id: z.uuid(), mosque_name: z.string() }))
        .parse(nominationsResult.data);
  return (
    <main id="main" className="directory-shell">
      <h1>My mosques</h1>
      <p>Signed in as {user.email}</p>
      {nominationsResult.error && (
        <p role="alert">
          Moderator nominations could not be loaded. Try again later.
        </p>
      )}
      {nominations.map((nomination) => (
        <section className="notice" key={nomination.id}>
          <h2>{nomination.mosque_name}</h2>
          <p>
            You have been nominated to edit daily prayer-time drafts. The owner
            publishes changes.
          </p>
          <NominationForm id={nomination.id} />
        </section>
      ))}
      <div className="actions">
        <form action={signOut}>
          <button className="button secondary">Sign out</button>
        </form>
        {platform === true && (
          <Link className="button" href="/platform">
            Platform review
          </Link>
        )}
        <Link href="/claims">My claims</Link>
      </div>
      {!memberships.length && (
        <p className="notice">
          You don’t manage a mosque yet. Find your mosque and submit a claim. A
          Minarah administrator must approve it before you can edit schedules.
        </p>
      )}
      <div className="admin-list">
        {memberships.map(
          (item) =>
            item.mosques && (
              <article key={item.mosques.id}>
                <h2>{item.mosques.name}</h2>
                <p>{item.role}</p>
                <Link className="button" href={`/admin/${item.mosques.id}`}>
                  Manage schedule
                </Link>{" "}
                {item.role !== "moderator" && (
                  <Link href={`/admin/${item.mosques.id}/qr`}>
                    View Mosque QR
                  </Link>
                )}
              </article>
            ),
        )}
      </div>
      <p>
        <Link href="/">Find a mosque</Link>
      </p>
    </main>
  );
}
