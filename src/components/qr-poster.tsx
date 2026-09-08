import Image from "next/image";
import QRCode from "qrcode";
import { Brand } from "./brand";
import { PrintButton } from "./print-button";
export async function QrPoster({
  name,
  url,
  demo = false,
}: {
  name: string;
  url: string;
  demo?: boolean;
}) {
  const image = await QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 640,
  });
  return (
    <main id="main" className="detail-shell">
      <section className="qr-poster">
        <Brand />
        <h1>{name}</h1>
        <p>Get our latest Jamaat times</p>
        <Image
          unoptimized
          src={image}
          width={320}
          height={320}
          alt={`Scan to open ${name} on Minarah`}
        />
        <p className="qr-url">
          <a href={url}>{url}</a>
        </p>
        <h2>Scan &amp; follow this mosque on Minarah</h2>
        {demo && (
          <p className="notice">
            Fictional demo mosque and times. This poster is a sample.
          </p>
        )}
      </section>
      <PrintButton />
    </main>
  );
}
