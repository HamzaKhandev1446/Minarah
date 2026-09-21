import type { Metadata, Viewport } from "next";
import { Brand } from "@/components/brand";
import { PublicProvider } from "@/components/public-context";
import { AppNavigation } from "@/features/navigation/components/app-navigation";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./public-mobile.css";

export const metadata: Metadata = {
  title: "Minarah — Jamaat, together",
  description:
    "Mosque-published Jamaat times. A simpler way to stay connected with your mosque.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Minarah" },
  icons: { apple: "/icons/icon-192.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#174f46",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="header-inner">
            <Brand />
            <AppNavigation />
          </div>
        </header>
        <PublicProvider>{children}</PublicProvider>
        <footer className="site-footer">
          <Brand />
          <p>Closer to your mosque. Together in prayer.</p>
        </footer>
      </body>
    </html>
  );
}
