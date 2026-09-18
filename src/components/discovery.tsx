"use client";
import Link from "next/link";
import { UiIcon } from "./ui-icon";
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
    <main
      id="main"
      className={`directory-shell explorer ${view === "following" ? "is-following" : "is-map"}`}
    >
      <div className="explorer-heading">
        <section className="discovery-intro">
          <p className="eyebrow">A place to belong</p>
          <h1>
            {view === "following" ? "Your mosques." : "Your mosque, closer."}
          </h1>
          <p>
            {view === "following"
              ? "The places you return to. The times that matter."
              : "Find your mosque. Stay close to your community."}
          </p>
        </section>
        <div className="home-tabs" aria-label="Mosque views">
          <button
            className={view === "map" ? "view-tab active" : "view-tab"}
            aria-pressed={view === "map"}
            onClick={() => {
              setView("map");
              if (heading === "Mosques you follow")
                setHeading("Find your mosque");
            }}
          >
            <UiIcon name="pin" size={18} />
            Map & discover
          </button>
          <button
            className={view === "following" ? "view-tab active" : "view-tab"}
            aria-pressed={view === "following"}
            onClick={() => {
              cancelLocation();
              setView("following");
              setHeading("Mosques you follow");
              void load({ kind: "followed", ids });
            }}
          >
            <UiIcon name="heart" size={18} />
            Following ({ids.length})
          </button>
        </div>
      </div>
      {mode === "demo" && (
        <div className="demo-strip">
          <span className="status-dot" />
          <strong>Demo · fictional Karachi mosques and schedules.</strong>
          <span>Do not use these times for prayer attendance.</span>
          <Link href="/">Return to live directory</Link>
        </div>
      )}
      <div className="explore-layout">
        {view !== "following" && (
          <section className="explorer-map" aria-label="Discover on the map">
            <MosqueMap
              results={visibleResults}
              onSelect={openBoard}
              center={mapCenter}
              places={places}
              onSelectPlace={setSelectedPlace}
            />
            <section className="map-search-panel" aria-label="Find mosques">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  cancelLocation();
                  setHeading("Search results");
                  void load({ kind: "search", query: text.trim() });
                  void findPlaces(text.trim());
                }}
              >
                <label className="visually-hidden" htmlFor="mosque-search">
                  Search by mosque name or city
                </label>
                <div className="map-search-field">
                  <UiIcon name="search" />
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
                        : "Search a mosque or city"
                    }
                  />
                  <button
                    type="submit"
                    className="button"
                    disabled={busy || placesBusy || text.trim().length < 2}
                  >
                    Search
                  </button>
                </div>
              </form>
              <div className="map-quick-actions">
                <button
                  className="map-chip"
                  onClick={locate}
                  disabled={locating}
                >
                  <UiIcon name="locate" size={17} />
                  {locating ? "Finding location…" : "Use my location"}
                </button>
                {mode === "demo" && (
                  <button
                    className="map-chip"
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
              {location !==
                "Location is optional. Search manually at any time." && (
                <p className="map-status" role="status">
                  {location}
                </p>
              )}
            </section>
            {!data && !selectedPlace && !busy && places.length === 0 && (
              <div className="map-hint">
                <span className="hint-icon">
                  <UiIcon name="mosque" size={23} />
                </span>
                <div>
                  <strong>Your next prayer starts here</strong>
                  <span>Search above or use your location to get started.</span>
                </div>
              </div>
            )}
            {selectedPlace && (
              <article
                className="map-selection"
                aria-label="Selected map place"
              >
                <div className="selection-heading">
                  <span className="place-category">Map listing</span>
                  <button
                    className="icon-button"
                    aria-label="Close map place"
                    onClick={() => setSelectedPlace(null)}
                  >
                    ×
                  </button>
                </div>
                <h2>{selectedPlace.name || "Map place"}</h2>
                <p>
                  {selectedPlace.address} {selectedPlace.city}
                </p>
                <p className="availability-note">
                  No mosque-published Jamaat times are linked to this listing
                  yet.
                </p>
                <div className="actions">
                  <button
                    className="button"
                    onClick={() => togglePlace(selectedPlace)}
                  >
                    <UiIcon name="heart" size={17} />
                    {savedPlaces.some(
                      (p) => placeKey(p) === placeKey(selectedPlace),
                    )
                      ? "Remove favourite place"
                      : "Add place to favourites"}
                  </button>
                  <Link
                    className="text-action"
                    href={`/register-mosque?lat=${selectedPlace.latitude}&lng=${selectedPlace.longitude}`}
                  >
                    Register this mosque <UiIcon name="arrow" size={17} />
                  </Link>
                </div>
              </article>
            )}
          </section>
        )}
        <section
          className="discovery-results"
          aria-labelledby="results-heading"
          aria-busy={busy}
        >
          <div className="results-heading">
            <div>
              <p className="eyebrow">
                {view === "following"
                  ? "Saved for you"
                  : "Discover your community"}
              </p>
              <h2 id="results-heading">{heading}</h2>
            </div>
            {data && (
              <span className="result-count">
                {visibleResults.length}
                {heading.startsWith("Near")
                  ? ` · ${data.radiusMeters / 1000} km`
                  : ""}
              </span>
            )}
          </div>
          {!available && (
            <p role="status" className="notice">
              Browser storage is unavailable. Following cannot be saved here.
            </p>
          )}
          {placeError && (
            <p role="status" className="notice">
              {placeError}
            </p>
          )}
          {placesBusy && <p role="status">Searching map places…</p>}
          {busy && <p role="status">Loading published Jamaat information…</p>}
          {error && (
            <div className="notice error" role="alert">
              <p>{error}</p>
              {data && (
                <p>
                  Refresh failed. Previously loaded information may have
                  changed.
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
          {mode === "live" &&
            (view === "following" ? savedPlaces : places).length > 0 && (
              <section className="map-place-list" aria-label="Map places">
                <h3>
                  {view === "following"
                    ? "Favourite map places"
                    : "Other places on the map"}
                </h3>
                <p className="muted">No linked Minarah timetable yet.</p>
                <ul className="place-results">
                  {(view === "following" ? savedPlaces : places).map((p) => (
                    <li key={placeKey(p)}>
                      <span className="place-list-icon">
                        <UiIcon name="pin" size={19} />
                      </span>
                      <button
                        className="place-list-name"
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
                        className={`icon-button ${savedPlaces.some((saved) => placeKey(saved) === placeKey(p)) ? "is-saved" : ""}`}
                        aria-label={
                          savedPlaces.some(
                            (saved) => placeKey(saved) === placeKey(p),
                          )
                            ? "Remove favourite place"
                            : "Add place to favourites"
                        }
                        onClick={() => togglePlace(p)}
                      >
                        <UiIcon name="heart" size={19} />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="provider-credit">
                  Place data © OpenStreetMap · Photon
                </p>
              </section>
            )}
          {!busy && !error && data && visibleResults.length === 0 && (
            <div className="discovery-empty">
              <span className="empty-icon">
                <UiIcon
                  name={view === "following" ? "heart" : "mosque"}
                  size={27}
                />
              </span>
              <h3>
                {view === "following"
                  ? "Make yourself at home"
                  : "Your mosque could be next"}
              </h3>
              <p>
                {heading === "Mosques you follow"
                  ? "Your mosques will appear here. Find your mosque, then choose Follow Mosque."
                  : "No registered mosques found. Try a mosque name or a nearby city."}
              </p>
              {view === "following" ? (
                <button
                  className="button"
                  onClick={() => {
                    setView("map");
                    setHeading("Find your mosque");
                    setData(null);
                  }}
                >
                  Find a mosque <UiIcon name="arrow" size={17} />
                </button>
              ) : (
                <Link className="text-action" href="/register-mosque">
                  Register your mosque <UiIcon name="arrow" size={17} />
                </Link>
              )}
            </div>
          )}
          {!data && !busy && !error && (
            <div className="discovery-empty">
              <span className="empty-icon">
                <UiIcon name="mosque" size={30} />
              </span>
              <h3>One community. Many mosques.</h3>
              <p>
                Find a mosque on the map, save it to Following, and open its
                published Jamaat times in a tap.
              </p>
              <div className="discovery-how">
                <span>
                  <b>1</b> Find your mosque
                </span>
                <span>
                  <b>2</b> Add to Following
                </span>
                <span>
                  <b>3</b> See Jamaat times
                </span>
              </div>
              {mode === "live" && (
                <Link className="demo-link" href="/?mode=demo">
                  Explore the fictional demo <UiIcon name="arrow" size={15} />
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
