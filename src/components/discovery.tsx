"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  locationErrorMessage,
  type DataMode,
  type DiscoveryQuery,
  type DiscoveryResponse,
} from "@/domain/discovery";
import { fetchDiscovery } from "@/lib/discovery-client";
import { useFollows, usePosition } from "./public-context";
import { ScheduleCard } from "./schedule-card";
import { useClock } from "./use-clock";
import { followsKey, parseFollows } from "@/lib/follows/storage";
export function Discovery({
  mode,
  initialNow,
}: {
  mode: DataMode;
  initialNow: string;
}) {
  const [text, setText] = useState("");
  const [data, setData] = useState<DiscoveryResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState(
    "Location is optional. Search manually at any time.",
  );
  const [locating, setLocating] = useState(false);
  const [heading, setHeading] = useState("Find your mosque");
  const { setPosition } = usePosition();
  const { ids, available } = useFollows(mode);
  const query = useRef<DiscoveryQuery | null>(null);
  const sequence = useRef(0);
  const geoSequence = useRef(0);
  const now = useClock(initialNow);
  const visibleResults =
    data?.results.filter(
      (result) =>
        heading !== "Mosques you follow" || ids.includes(result.mosque.id),
    ) ?? [];
  const invalidate = useCallback(() => {
    sequence.current++;
    geoSequence.current++;
  }, []);
  const load = useCallback(
    async (next: DiscoveryQuery, refresh = false) => {
      const requestId = ++sequence.current;
      query.current = next;
      setBusy(true);
      setError("");
      if (!refresh) setData(null);
      try {
        if (next.kind === "followed")
          next = {
            kind: "followed",
            ids: parseFollows(localStorage.getItem(followsKey(mode))),
          };
        const result = await fetchDiscovery(next, mode);
        if (requestId === sequence.current) setData(result);
      } catch (failure) {
        if (requestId === sequence.current)
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not load mosque information.",
          );
      } finally {
        if (requestId === sequence.current) setBusy(false);
      }
    },
    [mode],
  );
  useEffect(() => {
    const refresh = () => {
      if (query.current && document.visibilityState === "visible")
        void load(query.current, true);
    };
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      invalidate();
    };
  }, [load, invalidate]);
  function locate() {
    if (!navigator.geolocation) {
      setLocation(
        "This browser does not support location. Search by mosque name or city.",
      );
      return;
    }
    const requestId = ++geoSequence.current;
    setLocating(true);
    setLocation("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (value) => {
        if (requestId !== geoSequence.current) return;
        const coordinates = {
          latitude: value.coords.latitude,
          longitude: value.coords.longitude,
        };
        setPosition(coordinates);
        setLocating(false);
        setLocation("Location found. It is kept only for this visit.");
        setHeading("Near you");
        void load({ kind: "nearby", ...coordinates });
      },
      (failure) => {
        if (requestId !== geoSequence.current) return;
        setLocating(false);
        setLocation(locationErrorMessage(failure.code));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }
  function cancelLocation() {
    geoSequence.current++;
    setLocating(false);
    setLocation("Location is optional. Search manually at any time.");
  }
  return (
    <main id="main" className="directory-shell">
      <section className="discovery-intro">
        <p className="eyebrow">Together, in prayer</p>
        <h1>
          Your next Jamaat.
          <br />
          <em>Your mosque.</em>
        </h1>
        <p className="intro-copy">
          Mosque-published congregation times, wherever you call home.
        </p>
      </section>
      {mode === "demo" ? (
        <div className="notice">
          <strong>Demo · fictional Karachi mosques and schedules.</strong> Do
          not use these times for prayer attendance.{" "}
          <Link href="/">Return to live directory</Link>
        </div>
      ) : (
        <p className="muted">
          Want to try Minarah?{" "}
          <Link href="/?mode=demo">Explore the fictional demo</Link>.
        </p>
      )}
      <section className="discovery-controls" aria-label="Find mosques">
        <p>
          Minarah uses your location to find Jamaat times at mosques near you.
        </p>
        <div className="actions">
          <button className="button" onClick={locate} disabled={locating}>
            {locating ? "Finding location…" : "Use my location"}
          </button>
          <button
            className="button secondary"
            onClick={() => {
              cancelLocation();
              setHeading("Mosques you follow");
              void load({ kind: "followed", ids });
            }}
          >
            Following ({ids.length})
          </button>
          {mode === "demo" && (
            <button
              className="button secondary"
              onClick={() => {
                cancelLocation();
                setHeading("Near the sample Karachi location");
                void load({
                  kind: "nearby",
                  latitude: 24.8615,
                  longitude: 67.011,
                });
              }}
            >
              Try sample location
            </button>
          )}
        </div>
        <p role="status" className="muted">
          {location}
        </p>
        {!available && (
          <p role="status">
            Browser storage is unavailable. Following cannot be saved here.
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            cancelLocation();
            setHeading("Search results");
            void load({ kind: "search", query: text.trim() });
          }}
        >
          <label htmlFor="mosque-search">Search by mosque name or city</label>
          <div className="search-row">
            <input
              id="mosque-search"
              type="search"
              value={text}
              onChange={(event) => setText(event.target.value)}
              minLength={2}
              maxLength={120}
              required
              placeholder={
                mode === "demo" ? "Try Cedar or Karachi" : "Mosque name or city"
              }
            />
            <button
              className="button"
              type="submit"
              disabled={busy || text.trim().length < 2}
            >
              Search
            </button>
          </div>
        </form>
      </section>
      <section aria-labelledby="results-heading" aria-busy={busy}>
        <div className="results-heading">
          <h2 id="results-heading">{heading}</h2>
          {data && (
            <span className="muted">
              {visibleResults.length}{" "}
              {visibleResults.length === 1 ? "mosque" : "mosques"}
              {heading.startsWith("Near")
                ? ` within ${data.radiusMeters / 1000} km`
                : ""}
            </span>
          )}
        </div>
        {busy && <p role="status">Loading published Jamaat information…</p>}
        {error && (
          <div className="notice error" role="alert">
            <p>{error}</p>
            {data && (
              <p>
                Refresh failed. Previously loaded information may have changed.
              </p>
            )}
            <button
              className="button secondary"
              onClick={() => query.current && void load(query.current, true)}
            >
              Try again
            </button>
          </div>
        )}
        {!busy && !error && data && visibleResults.length === 0 && (
          <p className="empty-state">
            {heading === "Mosques you follow"
              ? "No followed mosques are available. Search for a mosque and choose Follow Mosque."
              : "No mosques found. Try a mosque name or a nearby city."}
          </p>
        )}
        {!data && !busy && !error && (
          <p className="empty-state">
            Use your location or search above to find published Jamaat times.
          </p>
        )}
        <div className="mosque-grid">
          {visibleResults.map((result) => (
            <ScheduleCard
              key={result.mosque.id}
              result={result}
              now={now}
              mode={mode}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
