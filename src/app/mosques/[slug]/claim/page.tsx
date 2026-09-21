import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { discoverMosques } from "@/server/mosques";
import { ClaimForm } from "@/features/onboarding/components/claim-form";
export const dynamic = "force-dynamic";
export default async function ClaimPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireUser();
  const { slug } = await params;
  const result = (await discoverMosques({ kind: "detail", slug }, "live"))
    .results[0];
  if (!result || result.mosque.isSynthetic) notFound();
  return (
    <main id="main" className="detail-shell">
      <h1>Claim {result.mosque.name}</h1>
      <p>
        A Minarah platform administrator will review your relationship to this
        mosque before granting access.
      </p>
      <ClaimForm mosqueId={result.mosque.id} />
    </main>
  );
}
