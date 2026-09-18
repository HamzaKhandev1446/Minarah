"use client";
import { useEffect, useRef, useState } from "react";
import { searchPlaces, type SelectedPlace } from "@/lib/place-search";
import { locationErrorMessage } from "@/domain/discovery";
import { UiIcon } from "./ui-icon";
import { OpenMap } from "./open-map";

export function LocationPicker({
  value,
  onChange,
}: {
  value: SelectedPlace | null;
  onChange: (place: SelectedPlace) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SelectedPlace[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    const pendingGeneration = generation;
    return () => {
      request.current?.abort();
      pendingGeneration.current++;
    };
  }, []);
  return (
    <section aria-label="Choose mosque location" className="location-picker">
      <div className="picker-search-panel">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const id = ++generation.current;
            request.current?.abort();
            const controller = new AbortController();
            request.current = controller;
            setBusy(true);
            setStatus("");
            setResults([]);
            const timeout = setTimeout(() => controller.abort(), 12000);
            try {
              const found = await searchPlaces(query, controller.signal);
              if (id === generation.current) {
                setResults(found);
                setStatus(
                  found.length
                    ? "Select a place, then adjust the pin to the mosque entrance."
                    : "No places found. Try the city or street, or place the pin manually.",
                );
              }
            } catch {
              if (id === generation.current)
                setStatus(
                  "Place search unavailable. Try again, use current location, or place the pin manually.",
                );
            } finally {
              clearTimeout(timeout);
              if (id === generation.current) setBusy(false);
            }
          }}
        >
          <label className="visually-hidden" htmlFor="place-search">
            Search mosque, street or city
          </label>
          <div className="map-search-field">
            <UiIcon name="search" />
            <input
              id="place-search"
              type="search"
              required
              minLength={2}
              maxLength={120}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mosque name and city"
            />
            <button
              aria-label="Search places"
              className="button"
              disabled={busy || query.trim().length < 2}
            >
              Search
            </button>
          </div>
        </form>
        <button
          type="button"
          className="map-chip picker-locate"
          disabled={busy}
          onClick={() => {
            if (!navigator.geolocation) {
              setStatus(
                "Location is unavailable. Search or set the pin manually.",
              );
              return;
            }
            const id = ++generation.current;
            setBusy(true);
            setStatus("Finding your location…");
            navigator.geolocation.getCurrentPosition(
              (p) => {
                if (id !== generation.current) return;
                onChange({
                  latitude: p.coords.latitude,
                  longitude: p.coords.longitude,
                  name: "",
                  address: "",
                  city: "",
                  countryCode: "",
                });
                setBusy(false);
                setStatus(
                  "Location found. Move the pin if the mosque is elsewhere.",
                );
              },
              (e) => {
                if (id !== generation.current) return;
                setBusy(false);
                setStatus(locationErrorMessage(e.code));
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
            );
          }}
        >
          <UiIcon name="locate" size={17} />
          Use current location
        </button>
        {status && (
          <p className="map-status" role="status">
            {status}
          </p>
        )}
        {results.length > 0 && (
          <ul className="place-results">
            {results.map((p, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    onChange(p);
                    setResults([]);
                    setStatus("");
                  }}
                >
                  {p.name || p.address || "Unnamed place"}
                  {p.city ? `, ${p.city}` : ""}
                  {p.countryCode ? `, ${p.countryCode}` : ""}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <OpenMap
        center={value ?? undefined}
        onPick={(latitude, longitude) =>
          onChange({
            name: value?.name || "",
            address: value?.address || "",
            city: value?.city || "",
            countryCode: value?.countryCode || "",
            latitude,
            longitude,
          })
        }
      />
      <div className="picker-caption">
        <UiIcon name="pin" size={17} />
        <p>Tap the map or drag the pin to the mosque entrance.</p>
      </div>
      <p className="provider-credit">
        Search: Photon / OpenStreetMap · Searches are shared with the provider.
      </p>
      <details>
        <summary>Enter exact coordinates</summary>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            onChange({
              ...value,
              name: value?.name || "",
              address: value?.address || "",
              city: value?.city || "",
              countryCode: value?.countryCode || "",
              latitude: Number(f.get("lat")),
              longitude: Number(f.get("lng")),
            });
          }}
        >
          <label>
            Latitude
            <input
              key={`lat:${value?.latitude}`}
              name="lat"
              type="number"
              required
              min="-90"
              max="90"
              step="any"
              defaultValue={value?.latitude}
            />
          </label>
          <label>
            Longitude
            <input
              key={`lng:${value?.longitude}`}
              name="lng"
              type="number"
              required
              min="-180"
              max="180"
              step="any"
              defaultValue={value?.longitude}
            />
          </label>
          <button className="button secondary">Set coordinates</button>
        </form>
      </details>
      {value && (
        <p className="selected-coordinates">
          Selected mosque location: {value.latitude.toFixed(6)},{" "}
          {value.longitude.toFixed(6)}
        </p>
      )}
    </section>
  );
}
