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
import { MosqueTile } from "./mosque-tile";
import { MosqueBoard } from "./mosque-board";
import { MosqueMap } from "./mosque-map";
import {
  opensKey,
  parseOpens,
  rankFollowed,
  recordOpen,
} from "@/lib/follows/ranking";
import type { MosqueResult } from "@/domain/discovery";
import { useClock } from "./use-clock";
import { followsKey, parseFollows } from "@/lib/follows/storage";
import { searchPlaces, type SelectedPlace } from "@/lib/place-search";
import {
  parseSavedPlaces,
  placeKey,
  savedPlacesKey,
} from "@/lib/follows/places";
const EMPTY_RESULTS: MosqueResult[] = [];
export function Discovery({
  mode,
  initialNow,
  initialView = "map",
}: {
  mode: DataMode;
  initialNow: string;
  initialView?: "following" | "map";
}) {
  const [text, setText] = useState("");
  const [places, setPlaces] = useState<SelectedPlace[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SelectedPlace[]>([]);
  const [placeError, setPlaceError] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(
    null,
  );
  const placeRequest = useRef<AbortController | null>(null);
  const [placesBusy, setPlacesBusy] = useState(false);
  const [data, setData] = useState<DiscoveryResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState(
    "Location is optional. Search manually at any time.",
  );
  const [locating, setLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState<
    { latitude: number; longitude: number } | undefined
  >();
  const [heading, setHeading] = useState(
    initialView === "following" ? "Mosques you follow" : "Find your mosque",
  );
  const [view, setView] = useState<"following" | "map" | "list">(initialView);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { setPosition } = usePosition();
  const { ids, available } = useFollows(mode);
  const query = useRef<DiscoveryQuery | null>(null);
  const sequence = useRef(0);
  const geoSequence = useRef(0);
  const now = useClock(initialNow);
  const visibleResults =
    heading === "Mosques you follow"
      ? rankFollowed(data?.results ?? EMPTY_RESULTS, ids, counts)
      : (data?.results ?? EMPTY_RESULTS);
  const selected = data?.results.find(
    (result) => result.mosque.id === selectedId,
  );
  function openBoard(result: MosqueResult) {
    try {
      recordOpen(localStorage, mode, result.mosque.id);
      setCounts(parseOpens(localStorage.getItem(opensKey(mode))));
    } catch {
      /* Timetable access does not depend on storage. */
    }
    setSelectedId(result.mosque.id);
    window.scrollTo({ top: 0 });
  }
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
    const timer = setTimeout(() => {
      try {
        setCounts(parseOpens(localStorage.getItem(opensKey(mode))));
        if (mode === "live")
          setSavedPlaces(
            parseSavedPlaces(localStorage.getItem(savedPlacesKey)),
          );
      } catch {
        /* Optional ranking. */
      }
      if (initialView === "following") void load({ kind: "followed", ids: [] });
    }, 0);
    return () => clearTimeout(timer);
  }, [load, mode, initialView]);
  useEffect(() => () => placeRequest.current?.abort(), []);
  async function findPlaces(term: string) {
    if (mode !== "live") return;
    placeRequest.current?.abort();
    const controller = new AbortController();
    placeRequest.current = controller;
    setPlacesBusy(true);
    setPlaces([]);
    setSelectedPlace(null);
    setPlaceError("");
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const found = await searchPlaces(term, controller.signal);
      if (placeRequest.current === controller) setPlaces(found);
    } catch {
      if (placeRequest.current === controller)
        setPlaceError(
          "Map-place search is unavailable. Registered mosque results are shown separately.",
        );
    } finally {
      clearTimeout(timeout);
      if (placeRequest.current === controller) setPlacesBusy(false);
    }
  }
  function togglePlace(place: SelectedPlace) {
    try {
      const current = parseSavedPlaces(localStorage.getItem(savedPlacesKey));
      const exists = current.some((p) => placeKey(p) === placeKey(place));
      if (!exists && current.length >= 50) {
        setPlaceError(
          "You can save up to 50 map places. Remove one before adding another.",
        );
        return;
      }
      const next = exists
        ? current.filter((p) => placeKey(p) !== placeKey(place))
        : [place, ...current];
      localStorage.setItem(savedPlacesKey, JSON.stringify(next));
      setSavedPlaces(next);
      setPlaceError("");
    } catch {
      setPlaceError(
        "Browser storage is unavailable. This place could not be saved.",
      );
    }
  }
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
        setMapCenter(coordinates);
        setPlaces([]);
        setSelectedPlace(null);
        setLocating(false);
        setLocation("Location found. It is kept only for this visit.");
        setHeading("Near you");
        setView("map");
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
  if (selectedId)
    return (
      <main id="main" className="board-shell">
        <button
          className="button secondary board-back"
          onClick={() => setSelectedId(null)}
        >
          ← Back to {view === "following" ? "Following" : "mosques"}
        </button>
        {error && (
          <p role="alert" className="notice error">
            {error} Previously loaded information may have changed.
          </p>
        )}
        {selected ? (
          <MosqueBoard result={selected} now={now} mode={mode} />
        ) : (
          <p className="empty-state">
            This mosque is no longer available. Return to your mosques to
            refresh.
          </p>
        )}
      </main>
    );
  return (
    <main id="main" className="directory-shell">
      <section className="discovery-intro">
        <p className="eyebrow">Together, in prayer</p>
        <h1>{view === "following" ? "Your mosques." : "Find your mosque."}</h1>
        <p className="intro-copy">
          {view === "following"
            ? "Your next prayer, one tap away. Most-opened mosques appear first."
            : "Find a mosque near you. Follow it for its latest Jamaat times."}
        </p>
      </section>
      <div className="home-tabs" aria-label="Mosque views">
        <button
          className={view === "following" ? "button" : "button secondary"}
          aria-pressed={view === "following"}
          onClick={() => {
            cancelLocation();
            setView("following");
            setHeading("Mosques you follow");
            void load({ kind: "followed", ids });
          }}
        >
          Following ({ids.length})
        </button>
        <button
          className={view === "map" ? "button" : "button secondary"}
          aria-pressed={view === "map"}
          onClick={() => {
            setView("map");
            if (heading === "Mosques you follow")
              setHeading("Find your mosque");
          }}
        >
          Map & discover
        </button>
      </div>
      {view === "map" && (
        <MosqueMap
          results={visibleResults}
          onSelect={openBoard}
          center={mapCenter}
          places={places}
          onSelectPlace={setSelectedPlace}
        />
      )}
      {view === "map" && selectedPlace && (
        <article className="notice" aria-label="Selected map place">
          <h2>{selectedPlace.name || "Map place"}</h2>
          <p>
            {selectedPlace.address} {selectedPlace.city}
          </p>
          <p>
            Map-provider listing — no linked Minarah timetable. No
            mosque-published Jamaat times are available for this listing. Check
            registered mosque results for a linked timetable.
          </p>
          <div className="actions">
            <button
              className="button"
              onClick={() => togglePlace(selectedPlace)}
            >
              {savedPlaces.some((p) => placeKey(p) === placeKey(selectedPlace))
                ? "Remove favourite place"
                : "Add place to favourites"}
            </button>
            <Link
              className="button secondary"
              href={`/register-mosque?lat=${selectedPlace.latitude}&lng=${selectedPlace.longitude}`}
            >
              Register this mosque
            </Link>
          </div>
        </article>
      )}
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
      {view !== "following" && (
        <section className="discovery-controls" aria-label="Find mosques">
          <p>
            Minarah uses your location to find Jamaat times at mosques near you.
          </p>
          <div className="actions">
            <button className="button" onClick={locate} disabled={locating}>
              {locating ? "Finding location…" : "Use my location"}
            </button>
            {mode === "demo" && (
              <button
                className="button secondary"
                onClick={() => {
                  cancelLocation();
                  setHeading("Near the sample Karachi location");
                  setView("map");
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
              void findPlaces(text.trim());
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
                  mode === "demo"
                    ? "Try Cedar or Karachi"
                    : "Mosque name or city"
                }
              />
              <button
                className="button"
                type="submit"
                disabled={busy || placesBusy || text.trim().length < 2}
              >
                Search
              </button>
            </div>
          </form>
        </section>
      )}
      {!available && view === "following" && (
        <p role="status" className="notice">
          Browser storage is unavailable. Following cannot be saved here. Use
          Map & discover to find a mosque.
        </p>
      )}

      <section aria-labelledby="results-heading" aria-busy={busy}>
        {placeError && (
          <p role="status" className="notice">
            {placeError}
          </p>
        )}
        {placesBusy && <p role="status">Searching map places…</p>}
        {mode === "live" &&
          (view === "following" ? savedPlaces : places).length > 0 && (
            <section aria-label="Map places">
              <h2>
                {view === "following"
                  ? "Favourite map places"
                  : "Map-place results"}
              </h2>
              <p className="muted">
                These locations have no linked Minarah timetable. Place data ©
                OpenStreetMap, search by Photon.
              </p>
              <ul className="place-results">
                {(view === "following" ? savedPlaces : places).map((p) => (
                  <li key={placeKey(p)}>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setSelectedPlace(p);
                        setPlaces([p]);
                        setView("map");
                        window.scrollTo({ top: 0 });
                      }}
                    >
                      {p.name || p.address || "Map place"}
                      {p.city ? `, ${p.city}` : ""}
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => togglePlace(p)}
                    >
                      {savedPlaces.some(
                        (saved) => placeKey(saved) === placeKey(p),
                      )
                        ? "Remove favourite place"
                        : "Add place to favourites"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
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
          <div className="empty-state">
            {heading === "Mosques you follow"
              ? "Your mosques will appear here. Find your mosque, then choose Follow Mosque."
              : "No registered mosques found. Try a mosque name or a nearby city."}
            {view !== "following" && (
              <p>
                <Link href="/register-mosque">
                  Register your mosque at this location
                </Link>
              </p>
            )}
            {view === "following" && (
              <p>
                <button
                  className="button"
                  onClick={() => {
                    setView("map");
                    setHeading("Find your mosque");
                    setData(null);
                  }}
                >
                  Find a mosque
                </button>
              </p>
            )}
          </div>
        )}
        {!data && !busy && !error && (
          <p className="empty-state">
            Use your location or search above to find published Jamaat times.
          </p>
        )}
        <div className="mosque-grid">
          {visibleResults.map((result, index) => (
            <MosqueTile
              key={result.mosque.id}
              result={result}
              now={now}
              mode={mode}
              onOpen={() => openBoard(result)}
              favourite={
                view === "following" &&
                index === 0 &&
                (counts[result.mosque.id] ?? 0) > 0
              }
            />
          ))}
        </div>
      </section>
    </main>
  );
}
