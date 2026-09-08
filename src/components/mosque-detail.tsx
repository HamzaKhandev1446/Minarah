"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DataMode, DiscoveryResponse } from "@/domain/discovery";
import { fetchDiscovery } from "@/lib/discovery-client";
import { ScheduleCard } from "./schedule-card";
import { useClock } from "./use-clock";
import { usePosition } from "./public-context";
export function MosqueDetail({
  initial,
  mode,
  slug,
  fromQr = false,
}: {
  initial: DiscoveryResponse;
  mode: DataMode;
  slug: string;
  fromQr?: boolean;
}) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const now = useClock(initial.fetchedAt);
  const { position } = usePosition();
  const invalidate = useCallback(() => {
    sequence.current++;
  }, []);
  const refresh = useCallback(async () => {
    const id = ++sequence.current;
    try {
      const response = await fetchDiscovery(
        { kind: "detail", slug, coordinates: position ?? undefined },
        mode,
      );
      if (id === sequence.current) {
        setData(response);
        setError("");
      }
    } catch {
      if (id === sequence.current)
        setError(
          "Could not refresh this schedule. Previously loaded information may have changed.",
        );
    }
  }, [mode, slug, position]);
  useEffect(() => {
    const update = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(update, 60000);
    const initialRefresh = position ? setTimeout(update, 0) : undefined;
    window.addEventListener("focus", update);
    return () => {
      invalidate();
      clearTimeout(initialRefresh);
      clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, [refresh, invalidate, position]);
  return (
    <main id="main" className="detail-shell">
      <Link className="back-link" href={mode === "demo" ? "/?mode=demo" : "/"}>
        ← Find mosques
      </Link>
      <h1>Mosque Jamaat times</h1>
      {fromQr && (
        <p className="notice">
          Get this mosque’s latest Jamaat times. Check the mosque name below,
          then choose Follow Mosque to save it on this browser.
        </p>
      )}
      {mode === "demo" && (
        <Link href={`/demo/qr/${slug}`}>View sample QR poster</Link>
      )}
      {mode === "demo" && (
        <p className="notice">
          Demo only · this mosque and its times are fictional.
        </p>
      )}
      {error && (
        <div role="alert" className="notice error">
          {error}
          <button className="button secondary" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      )}
      {data.results[0] ? (
        <ScheduleCard result={data.results[0]} mode={mode} now={now} detail />
      ) : (
        <p className="empty-state">
          This mosque is no longer available in the public directory.
        </p>
      )}
    </main>
  );
}
