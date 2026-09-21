"use client";
import { useEffect, useState } from "react";
import { MenuRow } from "@/components/menu-row";
import { useFollows } from "@/components/public-context";
import {
  NOTIFICATION_KEY,
  readNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notification-preferences";
import { fetchDiscovery } from "@/lib/discovery-client";
import { currentSchedule } from "@/domain/discovery";
import { BackgroundNotifications } from "./background-notifications";
import { backgroundPushRegistered } from "@/lib/push-device";

export function NotificationSettings() {
  const [settings, setSettings] = useState(() =>
    readNotificationPreferences(null),
  );
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [backgroundActive, setBackgroundActive] = useState(false);
  const { ids } = useFollows("live");
  const idsKey = ids.join(",");
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setBackgroundActive(backgroundPushRegistered(localStorage));
        setSettings(
          readNotificationPreferences(localStorage.getItem(NOTIFICATION_KEY)),
        );
      } catch {
        setMessage("Device storage is unavailable.");
      }
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  function save(next: NotificationPreferences) {
    try {
      localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(next));
      setSettings(next);
      setMessage("Preferences saved on this device.");
    } catch {
      setMessage("Could not save preferences. Check browser storage settings.");
    }
  }
  useEffect(() => {
    if (
      !ready ||
      backgroundActive ||
      !settings.enabled ||
      !idsKey ||
      !("Notification" in window)
    )
      return;
    let cancelled = false;
    let running = false;
    const poll = async () => {
      if (running || cancelled || Notification.permission !== "granted") return;
      running = true;
      try {
        const response = await fetchDiscovery(
          { kind: "followed", ids: idsKey.split(",") },
          "live",
        );
        const registration = await navigator.serviceWorker.ready;
        for (const result of response.results) {
          if (cancelled) break;
          const { today, next } = currentSchedule(
            result,
            new Date().toISOString(),
          );
          const baselineKey = `minarah:notification-publication:${result.mosque.id}`;
          const previous = localStorage.getItem(baselineKey);
          if (today.publishedAt) {
            if (
              settings.changes &&
              previous &&
              previous !== today.publishedAt
            ) {
              await registration.showNotification(
                `${result.mosque.name}: timetable updated`,
                {
                  body: "Open the mosque to see its latest published Jamaat times.",
                  tag: baselineKey,
                  icon: "/icons/icon-192.png",
                  data: { url: `/mosques/${result.mosque.slug}` },
                },
              );
            }
            localStorage.setItem(baselineKey, today.publishedAt);
          }
          if (
            settings.reminders &&
            next &&
            next.timeRemainingMs > 0 &&
            next.timeRemainingMs <= settings.minutes * 60000
          ) {
            const key = `minarah:notification-reminder:${result.mosque.id}`;
            const event = `${next.prayer}:${next.jamaatInstant}`;
            if (localStorage.getItem(key) !== event) {
              await registration.showNotification(
                `${next.label} at ${result.mosque.name}`,
                {
                  body: `Jamaat starts in ${Math.ceil(next.timeRemainingMs / 60000)} minutes.`,
                  tag: key,
                  icon: "/icons/icon-192.png",
                  data: { url: `/mosques/${result.mosque.slug}` },
                },
              );
              localStorage.setItem(key, event);
            }
          }
        }
      } catch {
        /* Retry on the next poll; never notify from invented data. */
      } finally {
        running = false;
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ready, settings, idsKey, backgroundActive]);
  return (
    <details className="notification-settings no-print">
      <summary>
        <MenuRow
          icon="bell"
          title="Notifications"
          description="Jamaat reminders and timetable updates"
        />
      </summary>
      <fieldset disabled={!ready}>
        <legend>Notifications for your favourite mosques</legend>
        <p>
          Choose both alert types or just one. Alerts work while Minarah is
          open. You can also enable background delivery below when it is
          available.
        </p>
        <label>
          <input
            type="checkbox"
            checked={settings.reminders}
            onChange={(event) =>
              save({ ...settings, reminders: event.target.checked })
            }
          />{" "}
          Jamaat reminders
        </label>
        <label>
          Remind me{" "}
          <select
            value={settings.minutes}
            disabled={!settings.reminders}
            onChange={(event) =>
              save({
                ...settings,
                minutes: Number(event.target.value) as 5 | 10 | 15,
              })
            }
          >
            <option value="5">5 minutes before</option>
            <option value="10">10 minutes before</option>
            <option value="15">15 minutes before</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.changes}
            onChange={(event) =>
              save({ ...settings, changes: event.target.checked })
            }
          />{" "}
          Timetable-change alerts
        </label>
        {!ids.length && (
          <p>Add a mosque to Favourites to receive its alerts.</p>
        )}
        <button
          type="button"
          className="button"
          onClick={async () => {
            if (settings.enabled) {
              save({ ...settings, enabled: false });
              return;
            }
            if (
              !("Notification" in window) ||
              !("serviceWorker" in navigator)
            ) {
              setMessage(
                "Notifications are unavailable here. On iPhone, install Minarah to your Home Screen first.",
              );
              return;
            }
            try {
              const permission = await Notification.requestPermission();
              if (permission !== "granted") {
                setMessage(
                  "Notifications are blocked. You can allow them in your browser settings.",
                );
                return;
              }
              await navigator.serviceWorker.register("/sw.js");
              save({ ...settings, enabled: true });
            } catch {
              setMessage("Could not enable notifications. Please try again.");
            }
          }}
        >
          {settings.enabled ? "Disable notifications" : "Enable notifications"}
        </button>
      </fieldset>
      <BackgroundNotifications
        settings={settings}
        ids={ids}
        onActive={setBackgroundActive}
      />
      <p role="status">{message}</p>
    </details>
  );
}
