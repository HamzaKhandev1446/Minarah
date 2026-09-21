import { z } from "zod";
import { requireMember } from "@/server/auth";
import { siteOrigin } from "@/server/qr";
import { QrPoster } from "@/features/administration/components/qr-poster";
export const dynamic = "force-dynamic";
export default async function AdminQr({
  params,
}: {
  params: Promise<{ mosqueId: string }>;
}) {
  const { mosqueId } = await params;
  const { db } = await requireMember(mosqueId);
  const codeResult = await db.rpc("ensure_mosque_qr", {
    target_mosque: mosqueId,
  });
  if (codeResult.error) throw new Error("QR code could not be loaded.");
  const code = z.string().parse(codeResult.data);
  const mosqueResult = await db
    .from("mosques")
    .select("name")
    .eq("id", mosqueId)
    .single();
  if (mosqueResult.error) throw new Error("Mosque could not be loaded.");
  const { name } = z.object({ name: z.string() }).parse(mosqueResult.data);
  return <QrPoster name={name} url={`${siteOrigin()}/q/${code}`} />;
}
