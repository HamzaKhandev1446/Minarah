import Link from "next/link";
import { z } from "zod";
import { requireUser } from "@/server/auth";
export const dynamic = "force-dynamic";
export default async function Claims() {
  const { db, user } = await requireUser();
  const { data, error } = await db
    .from("mosque_claims")
    .select("id,status,created_at,mosques(name)")
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error("Claims could not be loaded.");
  const claims = z
    .array(
      z.object({
        id: z.string(),
        status: z.string(),
        created_at: z.string(),
        mosques: z.object({ name: z.string() }).nullable(),
      }),
    )
    .parse(data);
  return (
    <main id="main" className="detail-shell">
      <h1>My mosque claims</h1>
      {!claims.length && (
        <p>No claims yet. Find your mosque and choose Claim this mosque.</p>
      )}
      <ul>
        {claims.map((claim) => (
          <li key={claim.id}>
            {claim.mosques?.name ?? "Unavailable mosque"} — {claim.status}
          </li>
        ))}
      </ul>
      <Link href="/admin">My mosques</Link> · <Link href="/">Find mosques</Link>
    </main>
  );
}
