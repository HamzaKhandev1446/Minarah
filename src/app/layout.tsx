import type { Metadata, Viewport } from "next";
import { Brand } from "@/components/brand";
import { PublicProvider } from "@/components/public-context";
import { PwaInstall } from "@/components/pwa";
import Link from "next/link";
import "./globals.css";
import "leaflet/dist/leaflet.css";

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
            <span className="header-note">Your mosque. Your community.</span>
            <nav aria-label="Main navigation" className="main-nav">
              <Link href="/">Map & discover</Link>
              <Link href="/?view=following">Following</Link>
              <Link href="/register-mosque">Register your mosque</Link>
            </nav>
          </div>
        </header>
        <PublicProvider>{children}</PublicProvider>
        <footer className="site-footer">
          <Brand />
          <p>Closer to your mosque. Together in prayer.</p>
          <span>Minarah · Phase 1</span>
          <PwaInstall />
        </footer>
      </body>
    </html>
  );
}
