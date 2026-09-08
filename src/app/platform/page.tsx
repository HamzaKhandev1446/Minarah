import Link from "next/link";
import { z } from "zod";
import { requirePlatformAdmin } from "@/server/auth";
import { ReviewForm } from "@/components/review-form";
export const dynamic = "force-dynamic";
export default async function Platform() {
  const { db } = await requirePlatformAdmin();
  const [claimsResult, submissionsResult] = await Promise.all([
    db
      .from("mosque_claims")
      .select(
        "id,name,contact,role_at_mosque,explanation,supporting_details,mosques(name)",
      )
      .eq("status", "pending")
      .order("created_at")
      .limit(100),
    db
      .from("mosque_submissions")
      .select(
        "id,name,address_line,city,country_code,latitude,longitude,timezone,phone,website,notes",
      )
      .eq("status", "pending")
      .order("created_at")
      .limit(100),
  ]);
  if (claimsResult.error || submissionsResult.error)
    throw new Error("Review queue could not be loaded.");
  const claims = z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        contact: z.string(),
        role_at_mosque: z.string(),
        explanation: z.string(),
        supporting_details: z.string().nullable(),
        mosques: z.object({ name: z.string() }).nullable(),
      }),
    )
    .parse(claimsResult.data);
  const submissions = z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        address_line: z.string(),
        city: z.string(),
        country_code: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        timezone: z.string(),
        phone: z.string().nullable(),
        website: z.string().nullable(),
        notes: z.string().nullable(),
      }),
    )
    .parse(submissionsResult.data);
  return (
    <main id="main" className="directory-shell">
      <Link href="/admin">← My mosques</Link>
      <h1>Platform review</h1>
      <h2>Pending mosque claims</h2>
      {!claims.length && <p>No pending claims.</p>}
      <div className="admin-list">
        {claims.map((claim) => (
          <article key={claim.id}>
            <h3>{claim.mosques?.name ?? "Unavailable mosque"}</h3>
            <p>
              {claim.name} · {claim.role_at_mosque}
            </p>
            <p>{claim.contact}</p>
            <p>{claim.explanation}</p>
            <p>{claim.supporting_details}</p>
            <ReviewForm id={claim.id} kind="claim" />
          </article>
        ))}
      </div>
      <h2>Pending mosque submissions</h2>
      {!submissions.length && <p>No pending submissions.</p>}
      <div className="admin-list">
        {submissions.map((item) => (
          <article key={item.id}>
            <h3>{item.name}</h3>
            <p>
              {item.address_line}, {item.city}, {item.country_code}
            </p>
            <p>
              {item.latitude}, {item.longitude} · {item.timezone}
            </p>
            <p>
              {item.phone} {item.website}
            </p>
            <p>{item.notes}</p>
            <ReviewForm id={item.id} kind="submission" />
          </article>
        ))}
      </div>
    </main>
  );
}
