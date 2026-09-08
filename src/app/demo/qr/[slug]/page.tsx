import { notFound } from "next/navigation";
import { demoQrCode, siteOrigin } from "@/server/qr";
import { QrPoster } from "@/components/qr-poster";
import pilot from "@/data/pilot.json";
export default async function DemoPoster({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mosque = pilot.find((m) => m.slug === slug);
  if (!mosque) notFound();
  return (
    <QrPoster
      name={mosque.name}
      url={`${siteOrigin()}/q/${demoQrCode(slug)}?mode=demo`}
      demo
    />
  );
}
