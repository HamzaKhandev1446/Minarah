"use client";
import { useEffect, useState } from "react";
import { pushIdentitySchema } from "@/lib/push-contract";
import type { NotificationPreferences } from "@/lib/notification-preferences";
import { PUSH_DEVICE_KEY as KEY, backgroundPushRegistered } from "@/lib/push-device";

function identity() {
  const raw = localStorage.getItem(KEY);
  return raw ? pushIdentitySchema.parse(JSON.parse(raw)) : null;
}
async function updateDevice(
  method: "POST" | "DELETE",
  body: unknown,
  signal?: AbortSignal,
) {
  const response = await fetch("/api/push/subscription", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal,
  });
  if (!response.ok)
    throw new Error("Could not update background alerts. Please try again.");
}

export function BackgroundNotifications({
  settings,
  ids,
  onActive,
}: {
  settings: NotificationPreferences;
  ids: string[];
  onActive: (active: boolean) => void;
}) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const idsKey = ids.join(",");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/push/subscription", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((config) => {
        if (controller.signal.aborted) return;
        setPublicKey(
          config.available && typeof config.publicKey === "string"
            ? config.publicKey
            : null,
        );
          const saved = !!identity() && backgroundPushRegistered(localStorage);
        setActive(saved);
        onActive(saved);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setMessage("Background alert settings are unavailable.");
      });
    return () => controller.abort();
  }, [onActive]);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const device = identity();
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (!device || !subscription) {
          setMessage(
            "This browser subscription has expired. Turn background alerts off, then enable them again.",
          );
          return;
        }
        await updateDevice(
          "POST",
          {
            ...device,
            subscription: subscription.toJSON(),
            preferences: settings,
            mosqueIds: idsKey ? idsKey.split(",") : [],
          },
          controller.signal,
        );
        if (!controller.signal.aborted)
          setMessage(
            settings.enabled
              ? "Background preferences synced."
              : "Background alerts paused.",
          );
      } catch {
        if (!controller.signal.aborted)
          setMessage(
            "Preferences could not sync. Background alerts may still use the previous settings; retry when connected.",
          );
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, settings, idsKey]);

  return (
    <section className="background-alerts" aria-label="Background alerts">
      <h4>When Minarah is closed</h4>
      <p>
        {publicKey
          ? "Enable background alerts to sync your favourite mosque IDs and reminder preferences to this device’s subscription. No account or saved locations are shared."
          : "Background delivery is not connected on this deployment yet. Open-app alerts remain available."}
      </p>
      <button
        type="button"
        className="button secondary"
        disabled={
          busy || (!active && (!publicKey || !settings.enabled || !ids.length))
        }
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            if (
              !("serviceWorker" in navigator) ||
              !("PushManager" in window) ||
              !("Notification" in window)
            )
              throw new Error(
                "This browser does not support background push. On iPhone, install Minarah first.",
              );
            if (active) {
              const device = identity();
              if (device) await updateDevice("DELETE", device);
              const registration =
                await navigator.serviceWorker.getRegistration();
              await (
                await registration?.pushManager.getSubscription()
              )?.unsubscribe();
              localStorage.removeItem(KEY);
              setActive(false);
              onActive(false);
              setMessage("Background alerts removed from this device.");
              return;
            }
            if (!publicKey) return;
            if ((await Notification.requestPermission()) !== "granted")
              throw new Error(
                "Allow notifications in your browser settings to enable background alerts.",
              );
            const bytes = Uint8Array.from(
              atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")),
              (c) => c.charCodeAt(0),
            );
            await navigator.serviceWorker.register("/sw.js");
            const registration = await navigator.serviceWorker.ready;
            const subscription =
              (await registration.pushManager.getSubscription()) ??
              (await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: bytes,
              }));
            const device = identity() ?? {
              id: crypto.randomUUID(),
              token: Array.from(
                crypto.getRandomValues(new Uint8Array(32)),
                (n) => n.toString(16).padStart(2, "0"),
              ).join(""),
            };
            // Persist ownership before sending so a lost response can be retried safely.
            localStorage.setItem(KEY, JSON.stringify(device));
            await updateDevice("POST", {
              ...device,
              subscription: subscription.toJSON(),
              preferences: settings,
              mosqueIds: ids,
            });
            localStorage.setItem(
              KEY,
              JSON.stringify({ ...device, registered: true }),
            );
            setActive(true);
            onActive(true);
            setMessage(
              "Background alerts enabled. Delivery depends on your browser and connection.",
            );
          } catch (failure) {
            setMessage(
              failure instanceof Error
                ? failure.message
                : "Could not configure background alerts.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? "Updating…"
          : active
            ? "Disable background alerts"
            : "Enable background alerts"}
      </button>
      {!settings.enabled && !active && <p>Enable notifications above first.</p>}
      <p role="status">{message}</p>
    </section>
  );
}
