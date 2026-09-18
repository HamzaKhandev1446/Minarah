"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  currentSchedule,
  formatPublishedAt,
  jamaatTimingState,
  locationErrorMessage,
  remainingLabel,
  type DataMode,
  type DiscoveryQuery,
  type DiscoveryResponse,
  type MosqueResult,
} from "@/domain/discovery";
import { formatClockTime } from "@/domain/schedule";
import { localJamaatInstant } from "@/domain/schedule";
import { fetchDiscovery } from "@/lib/discovery-client";
import {
  FOLLOW_EVENT,
  followsKey,
  parseFollows,
  toggleFollow,
} from "@/lib/follows/storage";
import { useFollows, usePosition } from "./public-context";
import { useClock } from "./use-clock";
import { MosqueMap } from "./mosque-map";
import { UiIcon } from "./ui-icon";
import { SavedAddresses } from "./saved-addresses";
import { PublicMenu } from "./public-menu";
import {
  parseSavedAddresses,
  SAVED_ADDRESSES_KEY,
} from "@/lib/saved-addresses";

const EMPTY: MosqueResult[] = [];
const PRAYER_COLUMNS = [
  { key: "fajr", arabic: "فجر", english: "Fajr" },
  { key: "dhuhr", arabic: "ظهر", english: "Dhuhr" },
  { key: "asr", arabic: "عصر", english: "Asr" },
  { key: "maghrib", arabic: "مغرب", english: "Maghrib" },
  { key: "isha", arabic: "عشاء", english: "Isha" },
  { key: "jumuah", arabic: "جمعة", english: "Jumuah" },
] as const;

function NearbyMosqueList({
  results,
  now,
  mode,
  selectedId,
  onSelect,
}: {
  results: MosqueResult[];
  now: string;
  mode: DataMode;
  selectedId: string | null;
  onSelect: (result: MosqueResult) => void;
}) {
  const { ids } = useFollows(mode);
  return (
    <section className="nearby-mosque-list" aria-label="Mosques nearby">
      {results.map((result) => {
        const { today, next, fridaySessions, publishedJumuahSessions } =
          currentSchedule(result, now);
        const entries = new Map(
          today.entries.map((entry) => [entry.prayer, entry]),
        );
        const jumuah = publishedJumuahSessions[0] ?? null;
        const activeColumn = PRAYER_COLUMNS.find((column) => {
          const entry =
            column.key === "jumuah" ? jumuah : entries.get(column.key);
          if (!entry) return false;
          const instant = localJamaatInstant(
            today.localDate,
            entry.localTime,
            result.mosque.timezone,
          );
          if (column.key === "jumuah" && fridaySessions.length === 0)
            return false;
          return jamaatTimingState(instant?.toString() ?? null, now) !== null;
        });
        const nextColumn =
          next?.date === today.localDate
            ? PRAYER_COLUMNS.find((column) => column.key === next.prayer)
            : undefined;
        const emphasized = activeColumn ?? nextColumn;
        const highlightedEntry = activeColumn
          ? activeColumn.key === "jumuah"
            ? jumuah
            : entries.get(activeColumn.key)
          : null;
        const highlightedState = highlightedEntry
          ? jamaatTimingState(
              localJamaatInstant(
                today.localDate,
                highlightedEntry.localTime,
                result.mosque.timezone,
              )?.toString() ?? null,
              now,
            )
          : null;
        return (
          <article
            key={result.mosque.id}
            className={`nearby-mosque-row ${selectedId === result.mosque.id ? "is-selected" : ""}`}
            aria-label={`${result.mosque.name} Jamaat times`}
            onClick={() => onSelect(result)}
          >
            <div className="nearby-mosque-heading">
              <div>
                <h2>{result.mosque.name}</h2>
                <p className="nearby-mosque-meta">
                  {result.mosque.verificationStatus === "verified"
                    ? "Verified"
                    : "Not verified"}
                  {result.distanceMeters !== null &&
                    ` · ${(result.distanceMeters / 1000).toFixed(1)} km`}
                </p>
              </div>
              <button
                className="favourite-heart"
                aria-label={`${ids.includes(result.mosque.id) ? "Remove" : "Add"} ${result.mosque.name} ${ids.includes(result.mosque.id) ? "from" : "to"} favourites`}
                aria-pressed={ids.includes(result.mosque.id)}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFollow(localStorage, mode, result.mosque.id);
                  window.dispatchEvent(new Event(FOLLOW_EVENT));
                }}
              >
                <UiIcon name="heart" />
              </button>
            </div>
            <div className="preview-next nearby-next">
              <div>
                <span>
                  NEXT JAMAAT
                  {next && next.date !== today.localDate ? " · TOMORROW" : ""}
                </span>
                <strong>{next?.label ?? "Awaiting publication"}</strong>
              </div>
              <div>
                <b>{next ? formatClockTime(next.jamaatLocalTime) : "—"}</b>
                <small>
                  {next
                    ? remainingLabel(next.timeRemainingMs)
                    : "No published time"}
                </small>
              </div>
            </div>
            <div className="jamaat-time-grid">
              {PRAYER_COLUMNS.map((column) => {
                const isFridayDhuhr =
                  column.key === "dhuhr" && fridaySessions.length > 0;
                const entry =
                  column.key === "jumuah" || isFridayDhuhr
                    ? jumuah
                    : entries.get(column.key);
                const instant = entry
                  ? column.key === "jumuah" && fridaySessions.length === 0
                    ? null
                    : localJamaatInstant(
                        today.localDate,
                        entry.localTime,
                        result.mosque.timezone,
                      )
                  : null;
                const state = jamaatTimingState(
                  instant?.toString() ?? null,
                  now,
                );
                return (
                  <div
                    className={`jamaat-time-cell ${state ? `is-${state}` : ""} ${emphasized?.key === column.key || (isFridayDhuhr && emphasized?.key === "jumuah") ? "is-next" : ""}`}
                    key={column.key}
                    title={column.english}
                  >
                    <span lang="ar" className="jamaat-arabic">
                      {column.arabic}
                    </span>
                    <span className="jamaat-english">{column.english}</span>
                    {isFridayDhuhr && (
                      <small className="jummah-badge">Jummah</small>
                    )}
                    {state === "live" && (
                      <span className="qad-label is-live" lang="ar" dir="rtl">
                        قَدْ قَامَتِ الصَّلَاةُ
                      </span>
                    )}
                    <strong>
                      {entry ? formatClockTime(entry.localTime) : "—"}
                    </strong>
                  </div>
                );
              })}
            </div>
            {activeColumn && highlightedState && (
              <p className="jamaat-state" role="status">
                {activeColumn.key === "jumuah"
                  ? "Jumuah"
                  : activeColumn.english}{" "}
                {highlightedState === "live"
                  ? "is in progress"
                  : highlightedState === "recent"
                    ? "started recently"
                    : "is nearly starting"}
              </p>
            )}
            <Link
              className="nearby-view-mosque"
              href={`/mosques/${result.mosque.slug}${mode === "demo" ? "?mode=demo" : ""}`}
              onClick={(event) => event.stopPropagation()}
            >
              View mosque <UiIcon name="arrow" size={15} />
            </Link>
            <p className="schedule-freshness">
              {formatPublishedAt(today.publishedAt, result.mosque.timezone)}
            </p>
          </article>
        );
      })}
    </section>
  );
}
function JamaatPreview({
  result,
  now,
  mode,
  selected = false,
}: {
  result: MosqueResult;
  now: string;
  mode: DataMode;
  selected?: boolean;
}) {
  const { today, next } = currentSchedule(result, now);
  const { ids } = useFollows(mode);
  const [error, setError] = useState("");
  const saved = ids.includes(result.mosque.id);
  const href = `/mosques/${result.mosque.slug}${mode === "demo" ? "?mode=demo" : ""}`;
  return (
    <article
      className={`jamaat-preview ${selected ? "selected-preview" : ""}`}
      aria-label={result.mosque.name}
    >
      <div className="preview-heading">
        <div>
          <h2>
            <Link href={href}>{result.mosque.name}</Link>
          </h2>
          <p>
            <UiIcon name="check" size={17} />
            {result.mosque.isSynthetic
              ? "Fictional demo"
              : result.mosque.verificationStatus === "verified"
                ? "Verified"
                : "Not verified"}
            {result.distanceMeters !== null &&
              ` · ${(result.distanceMeters / 1000).toFixed(1)} km`}
          </p>
        </div>
        <button
          className="favourite-heart"
          aria-label={`${saved ? "Remove" : "Add"} ${result.mosque.name} ${saved ? "from" : "to"} favourites`}
          aria-pressed={saved}
          onClick={() => {
            try {
              toggleFollow(localStorage, mode, result.mosque.id);
              window.dispatchEvent(new Event(FOLLOW_EVENT));
              setError("");
            } catch {
              setError(
                "Your browser could not save this change. Please check storage settings.",
              );
            }
          }}
        >
          <UiIcon name="heart" />
        </button>
      </div>
      <div className="preview-next">
        <div>
          <span>
            NEXT JAMAAT
            {next && next.date !== today.localDate ? " · TOMORROW" : ""}
          </span>
          <strong>{next?.label ?? "Awaiting publication"}</strong>
        </div>
        <div>
          <b>{next ? formatClockTime(next.jamaatLocalTime) : "—"}</b>
          <small>
            {next ? remainingLabel(next.timeRemainingMs) : "No published time"}
          </small>
        </div>
      </div>
      {selected && (
        <Link className="view-mosque" href={href}>
          View mosque <UiIcon name="arrow" />
        </Link>
      )}
      <p className="schedule-freshness">
        {formatPublishedAt(today.publishedAt, result.mosque.timezone)}
      </p>
      {error && <p role="alert">{error}</p>}
    </article>
  );
}

export function PublicExperience({
  mode,
  initialNow,
  initialView = "map",
}: {
  mode: DataMode;
  initialNow: string;
  initialView?: "map" | "following";
}) {
  const [tab, setTab] = useState(initialView);
  const [text, setText] = useState("");
  const [data, setData] = useState<DiscoveryResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [prompt, setPrompt] = useState(true);
  const { position, setPosition } = usePosition();
  const [locationLabel, setLocationLabel] = useState("Near your location");
  const [placesOpen, setPlacesOpen] = useState(false);
  const { ids, available } = useFollows(mode);
  const now = useClock(initialNow);
  const searchInput = useRef<HTMLInputElement>(null);
  const sequence = useRef(0);
  const geoSequence = useRef(0);
  const query = useRef<DiscoveryQuery | null>(null);
  const nearbyQuery = useRef<DiscoveryQuery | null>(null);
  const initialPosition = useRef(position);
  const load = useCallback(
    async (next: DiscoveryQuery, refresh = false) => {
      const request = ++sequence.current;
      query.current = next;
      setBusy(true);
      setError("");
      if (!refresh) {
        setData(null);
        setSelectedId(null);
      }
      try {
        const response = await fetchDiscovery(next, mode);
        if (request === sequence.current) {
          setData(response);
          if (!refresh) setSelectedId(response.results[0]?.mosque.id ?? null);
        }
      } catch (failure) {
        if (request === sequence.current)
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to load published times.",
          );
      } finally {
        if (request === sequence.current) setBusy(false);
      }
    },
    [mode],
  );
  const invalidate = useCallback(() => {
    sequence.current++;
    geoSequence.current++;
  }, []);
  useEffect(() => {
    let disposed = false;
    const restore = async () => {
      let home;
      try {
        home = parseSavedAddresses(
          localStorage.getItem(SAVED_ADDRESSES_KEY),
        ).find(
          (place) =>
            place.kind === "home" || place.label.toLowerCase() === "home",
        );
      } catch {
        /* Device storage can be unavailable. */
      }
      const request = ++geoSequence.current;
      const apply = (
        coordinates: { latitude: number; longitude: number },
        label: string,
      ) => {
        if (disposed || request !== geoSequence.current) return;
        setPosition(coordinates);
        setLocationLabel(label);
        setPrompt(false);
        const next: DiscoveryQuery = { kind: "nearby", ...coordinates };
        nearbyQuery.current = next;
        if (initialView === "map") void load(next);
      };
      if (home) {
        apply(
          { latitude: home.latitude, longitude: home.longitude },
          `Near ${home.label}`,
        );
        return;
      }
      if (initialPosition.current)
        apply(initialPosition.current, "Near your location");
      try {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });
        if (
          disposed ||
          request !== geoSequence.current ||
          permission.state !== "granted"
        )
          return;
        navigator.geolocation.getCurrentPosition(
          (value) =>
            apply(
              {
                latitude: value.coords.latitude,
                longitude: value.coords.longitude,
              },
              "Near your location",
            ),
          (failure) => {
            if (
              !disposed &&
              request === geoSequence.current &&
              !initialPosition.current
            )
              setLocationMessage(locationErrorMessage(failure.code));
          },
          { maximumAge: 0, timeout: 10000 },
        );
      } catch {
        /* Keep the explicit location action available. */
      }
    };
    const timer = setTimeout(() => void restore(), 0);
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void restore();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [initialView, load, setPosition]);
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
  const idsKey = ids.join(",");
  useEffect(() => {
    if (tab !== "following") return;
    const timer = setTimeout(() => {
      try {
        void load({
          kind: "followed",
          ids: parseFollows(localStorage.getItem(followsKey(mode))),
        });
      } catch {
        void load({ kind: "followed", ids: [] });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [tab, idsKey, load, mode]);
  function nearby() {
    geoSequence.current++;
    setLocating(false);
    setTab("map");
    if (nearbyQuery.current) void load(nearbyQuery.current);
    else {
      sequence.current++;
      query.current = null;
      setData(null);
      setError("");
      setBusy(false);
    }
  }
  function manual() {
    geoSequence.current++;
    setLocating(false);
    setPrompt(false);
    searchInput.current?.focus();
  }
  function locate() {
    setPrompt(true);
    if (!navigator.geolocation) {
      setLocationMessage(
        "Location is unavailable in this browser. Search manually instead.",
      );
      return;
    }
    const request = ++geoSequence.current;
    setLocating(true);
    setLocationMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (value) => {
        if (request !== geoSequence.current) return;
        const coordinates = {
          latitude: value.coords.latitude,
          longitude: value.coords.longitude,
        };
        setPosition(coordinates);
        setLocationLabel("Near your location");
        setLocating(false);
        setPrompt(false);
        setLocationMessage("");
        const next: DiscoveryQuery = { kind: "nearby", ...coordinates };
        nearbyQuery.current = next;
        void load(next);
      },
      (failure) => {
        if (request === geoSequence.current) {
          setLocating(false);
          setLocationMessage(locationErrorMessage(failure.code));
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }
  const results =
    tab === "following"
      ? (data?.results ?? EMPTY).filter((result) =>
          ids.includes(result.mosque.id),
        )
      : (data?.results ?? EMPTY);
  return (
    <main id="main" className="public-mobile">
      <PublicMenu
        location={position ? locationLabel : "Choose your location"}
        onLocations={() => setPlacesOpen(true)}
      />
      <header className="public-heading">
        <h1>
          {tab === "map" ? "Find your next Jamaat." : "Your favourite mosques."}
        </h1>
        {placesOpen && (
          <SavedAddresses
            position={position}
            onClose={() => setPlacesOpen(false)}
            onLocate={() => {
              setPlacesOpen(false);
              setTab("map");
              locate();
            }}
            onSelect={(address) => {
              setPlacesOpen(false);
              geoSequence.current++;
              setLocating(false);
              setPosition({
                latitude: address.latitude,
                longitude: address.longitude,
              });
              setLocationLabel(`Near ${address.label}`);
              setTab("map");
              setPrompt(false);
              const next: DiscoveryQuery = {
                kind: "nearby",
                latitude: address.latitude,
                longitude: address.longitude,
              };
              nearbyQuery.current = next;
              void load(next);
            }}
          />
        )}
        <nav className="public-tabs" aria-label="Mosque views">
          <button aria-pressed={tab === "map"} onClick={nearby}>
            <UiIcon name="pin" />
            Nearby
          </button>
          <button
            aria-pressed={tab === "following"}
            onClick={() => {
              geoSequence.current++;
              setLocating(false);
              setTab("following");
            }}
          >
            <UiIcon name="heart" />
            Favourites
          </button>
        </nav>
      </header>
      {mode === "demo" && (
        <p className="public-demo">
          Fictional demo mosques and times. Not for prayer attendance.{" "}
          <Link href="/">Live directory</Link>
        </p>
      )}
      {tab === "map" && (
        <>
          <section className="nearby-map" aria-label="Nearby mosques">
            <MosqueMap
              results={results}
              onSelect={(result) => {
                setSelectedId(result.mosque.id);
                setPrompt(false);
              }}
              center={position ?? undefined}
              now={now}
              selectedId={selectedId}
            />
            <form
              className="nearby-search"
              onSubmit={(event) => {
                event.preventDefault();
                manual();
                const next: DiscoveryQuery = {
                  kind: "search",
                  query: text.trim(),
                };
                nearbyQuery.current = next;
                void load(next);
              }}
            >
              <UiIcon name="search" />
              <input
                ref={searchInput}
                aria-label="Search mosque or area"
                placeholder="Search mosque or area"
                type="search"
                minLength={2}
                maxLength={120}
                required
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <button
                type="submit"
                aria-label="Search"
                disabled={busy || text.trim().length < 2}
              >
                <UiIcon name="arrow" />
              </button>
            </form>
            <span className="area-count">
              {error
                ? "Mosque lookup unavailable"
                : busy
                  ? "Finding mosques…"
                  : `${results.length} mosques in this area`}
            </span>
            <button
              className="map-recenter"
              aria-label="Choose location"
              onClick={() => setPrompt(true)}
            >
              <UiIcon name="locate" />
            </button>
          </section>
          <section className="nearby-sheet">
            <span className="sheet-handle" />
            {prompt ? (
              <div className="location-explanation">
                <span className="location-symbol">
                  <UiIcon name="locate" size={25} />
                </span>
                <h2>A mosque, closer to you.</h2>
                <p>
                  Use your location to find nearby mosques and their latest
                  Jamaat times.
                </p>
                <p className="location-privacy">
                  Your location is used for this visit only.
                </p>
                <button
                  className="view-mosque"
                  onClick={locate}
                  disabled={locating}
                >
                  <UiIcon name="locate" />
                  {locating ? "Finding location…" : "Use my location"}
                </button>
                <button className="manual-search" onClick={manual}>
                  Search manually
                </button>
                {locationMessage && <p role="status">{locationMessage}</p>}
              </div>
            ) : null}
            {results.length > 0 ? (
              <NearbyMosqueList
                results={results}
                now={now}
                mode={mode}
                selectedId={selectedId}
                onSelect={(result) => {
                  setSelectedId(result.mosque.id);
                  setPrompt(false);
                }}
              />
            ) : !prompt ? (
              <div className="public-empty">
                <h2>
                  {busy ? "Finding your mosque…" : "Find a mosque near you"}
                </h2>
                <p>
                  {data
                    ? "No mosques found. Try another name, neighbourhood or city."
                    : "Search a mosque name, neighbourhood or city to see published Jamaat times."}
                </p>
              </div>
            ) : null}
            {mode === "demo" && (
              <button
                className="manual-search"
                onClick={() => {
                  setPrompt(false);
                  const next: DiscoveryQuery = {
                    kind: "nearby",
                    latitude: 24.8615,
                    longitude: 67.011,
                  };
                  nearbyQuery.current = next;
                  void load(next);
                }}
              >
                Try sample location
              </button>
            )}
          </section>
        </>
      )}
      {tab === "following" && (
        <section className="favourites-list" aria-label="Favourite mosques">
          <div className="saved-summary">
            <span>
              {ids.length} saved {ids.length === 1 ? "mosque" : "mosques"}
            </span>
            <span>Next Jamaat</span>
          </div>
          {results.map((result) => (
            <JamaatPreview
              key={result.mosque.id}
              result={result}
              now={now}
              mode={mode}
            />
          ))}
          {!busy && !error && results.length === 0 && (
            <div className="public-empty">
              <UiIcon name="heart" size={32} />
              <h2>Your mosques, saved here.</h2>
              <p>Tap a heart to keep a mosque’s Jamaat times close.</p>
              <button className="view-mosque" onClick={nearby}>
                Explore Nearby <UiIcon name="arrow" />
              </button>
            </div>
          )}
          <p className="favourites-note">
            Your mosques, always within reach.
            <br />
            Saved on this device. No account needed.
          </p>
        </section>
      )}
      {busy && (
        <p className="public-feedback" role="status">
          Loading published Jamaat information…
        </p>
      )}
      {error && (
        <p className="public-feedback" role="alert">
          {error}{" "}
          {data && "Refresh failed; displayed information may have changed."}
          <button
            onClick={() => query.current && void load(query.current, true)}
          >
            Try again
          </button>
        </p>
      )}
      {!available && (
        <p className="public-feedback" role="status">
          Browser storage is unavailable. Favourites cannot be saved here.
        </p>
      )}
    </main>
  );
}
