import { notFound } from "next/navigation";
import { MosqueDetail } from "@/features/discovery/components/mosque-detail";
import { discoverMosques } from "@/server/mosques";
export const dynamic = "force-dynamic";
export default async function MosquePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string; source?: string }>;
}) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 160) notFound();
  const search = await searchParams;
  const mode = search.mode === "demo" ? "demo" : "live";
  const initial = await discoverMosques({ kind: "detail", slug }, mode);
  if (!initial.results.length) notFound();
  return (
    <MosqueDetail
      key={`${mode}:${slug}`}
      initial={initial}
      slug={slug}
      mode={mode}
      fromQr={search.source === "qr_sticker"}
    />
  );
}
