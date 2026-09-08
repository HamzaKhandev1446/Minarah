import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveQr } from "@/server/qr";
export const dynamic = "force-dynamic";
export default async function QrPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { code } = await params;
  const demo = (await searchParams).mode === "demo";
  const result = await resolveQr(code, demo);
  if (result.status === "active" && result.mosque_slug)
    redirect(
      `/mosques/${encodeURIComponent(result.mosque_slug)}?source=qr_sticker${demo ? "&mode=demo" : ""}`,
    );
  return (
    <main id="main" className="detail-shell">
      <h1>
        {result.status === "disabled"
          ? "This QR code is disabled"
          : "QR code not found"}
      </h1>
      <p>Search for the mosque to find its current Minarah page.</p>
      <Link className="button" href={demo ? "/?mode=demo" : "/"}>
        Find a mosque
      </Link>
    </main>
  );
}
