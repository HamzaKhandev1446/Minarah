"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  locationErrorMessage,
  type DataMode,
  type DiscoveryQuery,
  type MosqueResult,
} from "@/domain/discovery";
import { useDiscoveryQuery } from "../hooks/use-discovery-query";
import { followsKey, parseFollows } from "@/lib/follows/storage";
import { useFollows, usePosition } from "@/components/public-context";
import { useClock } from "@/components/use-clock";
import { MosqueMap } from "@/features/maps/components/mosque-map";
import { UiIcon } from "@/components/ui-icon";
import { SavedAddresses } from "@/features/locations/components/saved-addresses";
import { PublicMenu } from "@/features/navigation/components/public-menu";
import {
  parseSavedAddresses,
  SAVED_ADDRESSES_KEY,
} from "@/lib/saved-addresses";
import { NearbyMosqueList } from "./nearby-mosque-list";
import { JamaatPreview } from "./jamaat-preview";
const EMPTY: MosqueResult[] = [];
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
  const {
    data,
    selectedId,
    setSelectedId,
    busy,
    error,
    query,
    load,
    invalidate: invalidateQuery,
    clear,
  } = useDiscoveryQuery(mode);
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [prompt, setPrompt] = useState(true);
  const { position, setPosition } = usePosition();
  const [locationLabel, setLocationLabel] = useState("Near your location");
  const [placesOpen, setPlacesOpen] = useState(false);
  const { ids, available } = useFollows(mode);
  const now = useClock(initialNow);
  const searchInput = useRef<HTMLInputElement>(null);
  const geoSequence = useRef(0);
  const nearbyQuery = useRef<DiscoveryQuery | null>(null);
  const initialPosition = useRef(position);
  const invalidate = useCallback(() => {
    invalidateQuery();
    geoSequence.current++;
  }, [invalidateQuery]);
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
  }, [load, invalidate, query]);
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
      clear();
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
      {data && error && (
        <p className="public-feedback" role="alert">
          Could not refresh. Showing the last successfully loaded times. Last
          checked:{" "}
          {new Intl.DateTimeFormat("en", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(data.fetchedAt))}
          .{" "}
          <button
            onClick={() => query.current && void load(query.current, true)}
          >
            Try again
          </button>
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
      {error && !data && (
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
