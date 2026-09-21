"use client";
import { useEffect, useState } from "react";
import { MenuRow } from "@/components/menu-row";
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
export function PwaInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        /* Browsing remains available when installation is unsupported. */
      });
    const install = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const installed = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  return (
    <div className="install-guide no-print">
      <details>
        <summary>
          <MenuRow
            icon="download"
            title="Install Minarah"
            description="One tap away, on your home screen"
          />
        </summary>
        <div className="install-instructions">
          {prompt ? (
            <button
              className="button secondary no-print"
              onClick={async () => {
                await prompt.prompt();
                await prompt.userChoice;
                setPrompt(null);
              }}
            >
              Install Minarah
            </button>
          ) : null}
          <p>
            <strong>Android:</strong> Open Minarah in Chrome. Use Install
            Minarah when offered, or the browser menu → Add to home screen →
            Install.
          </p>
          <p>
            <strong>iPhone:</strong> Open Minarah in Safari, tap Share → Add to
            Home Screen, enable Open as Web App if shown, then tap Add.
          </p>
          <p>
            Open the home screen icon to return to Nearby. Follow your mosques
            on that phone; favourites are stored on the device.
          </p>
        </div>
      </details>
    </div>
  );
}
