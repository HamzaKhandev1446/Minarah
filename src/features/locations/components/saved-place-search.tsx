"use client";
import { useEffect, useRef, useState } from "react";
import { searchPlaces, type SelectedPlace } from "@/lib/place-search";
import { UiIcon } from "@/components/ui-icon";

export function SavedPlaceSearch({
  onSelect,
}: {
  onSelect: (place: SelectedPlace) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SelectedPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );
  return (
    <section
      className="saved-place-search"
      aria-labelledby="new-location-title"
    >
      <h3 id="new-location-title">Add a new location</h3>
      <p>Search an area or address, then fine-tune the pin below.</p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (query.trim().length < 2) return;
          request.current?.abort();
          const controller = new AbortController();
          request.current = controller;
          setBusy(true);
          setResults([]);
          setMessage("");
          const timeout = setTimeout(() => controller.abort(), 12000);
          try {
            const places = await searchPlaces(query, controller.signal);
            if (request.current !== controller) return;
            setResults(places);
            setMessage(
              places.length
                ? "Choose a search result."
                : "No places found. Try a nearby street or choose a point on the map.",
            );
          } catch {
            if (request.current === controller)
              setMessage(
                "Search is unavailable. Try again or choose a point on the map.",
              );
          } finally {
            clearTimeout(timeout);
            if (request.current === controller) setBusy(false);
          }
        }}
      >
        <div className="saved-place-search-field">
          <UiIcon name="search" size={19} />
          <input
            aria-label="Search for a new location"
            type="search"
            placeholder="Area, street or city"
            required
            minLength={2}
            maxLength={120}
            value={query}
            onChange={(event) => {
              request.current?.abort();
              request.current = null;
              setBusy(false);
              setResults([]);
              setMessage("");
              setQuery(event.target.value);
            }}
          />
          <button
            type="submit"
            disabled={busy || query.trim().length < 2}
            aria-label="Search locations"
          >
            <UiIcon name="arrow" size={20} />
          </button>
        </div>
      </form>
      <p role="status">{busy ? "Searching places…" : message}</p>
      {results.length > 0 && (
        <ul className="saved-place-search-results">
          {results.map((place, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => {
                  onSelect(place);
                  setResults([]);
                  setMessage(
                    "Location selected. Adjust the pin if needed, then give this place a name.",
                  );
                }}
              >
                <UiIcon name="pin" size={19} />
                <span>
                  <strong>
                    {place.name ||
                      place.address ||
                      place.city ||
                      "Selected place"}
                  </strong>
                  <small>
                    {[place.address, place.city, place.countryCode]
                      .filter(Boolean)
                      .join(", ")}
                  </small>
                </span>
                <UiIcon name="chevron" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <small className="places-note">
        Search: Photon / OpenStreetMap. Your search is shared with the provider.
      </small>
    </section>
  );
}
