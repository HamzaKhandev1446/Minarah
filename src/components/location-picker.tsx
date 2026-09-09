"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { searchPlaces, type SelectedPlace } from "@/lib/place-search";
import { locationErrorMessage } from "@/domain/discovery";

export function LocationPicker({
  value,
  onChange,
}: {
  value: SelectedPlace | null;
  onChange: (place: SelectedPlace) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const current = useRef(value);
  const change = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SelectedPlace[]>([]);
  const [status, setStatus] = useState("");
  const [mapError, setMapError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    current.current = value;
    change.current = onChange;
  }, [value, onChange]);
  useEffect(() => {
    let disposed = false;
    const pendingGeneration = generation;
    let observer: ResizeObserver | undefined;
    void import("leaflet")
      .then((L) => {
        if (disposed || !container.current) return;
        const instance = L.map(container.current, {
          scrollWheelZoom: false,
        }).setView([30, 69], 5);
        map.current = instance;
        L.tileLayer(
          process.env.NEXT_PUBLIC_MAP_TILE_URL ||
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        )
          .on("tileerror", () => {
            if (!disposed)
              setMapError(
                "Map background unavailable. Search or enter coordinates below to set the location.",
              );
          })
          .addTo(instance);
        const pin = L.marker([30, 69], {
          draggable: true,
          alt: "Mosque location pin",
          icon: L.divIcon({
            className: "mosque-pin",
            html: "<span>+</span>",
            iconSize: [44, 44],
            iconAnchor: [22, 44],
          }),
        });
        marker.current = pin;
        const choose = (lat: number, lng: number) =>
          change.current({
            ...current.current,
            name: current.current?.name || "",
            address: current.current?.address || "",
            city: current.current?.city || "",
            countryCode: current.current?.countryCode || "",
            latitude: lat,
            longitude: ((((lng + 180) % 360) + 360) % 360) - 180,
          });
        instance.on("click", (event) =>
          choose(event.latlng.lat, event.latlng.lng),
        );
        pin.on("dragend", () => {
          const p = pin.getLatLng();
          choose(p.lat, p.lng);
        });
        observer = new ResizeObserver(() => instance.invalidateSize());
        observer.observe(container.current);
        setReady(true);
      })
      .catch(() => {
        if (!disposed)
          setMapError("Map unavailable. Search or enter coordinates below.");
      });
    return () => {
      disposed = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
      request.current?.abort();
      pendingGeneration.current++;
    };
  }, []);
  useEffect(() => {
    if (value && ready && map.current && marker.current) {
      marker.current
        .setLatLng([value.latitude, value.longitude])
        .addTo(map.current);
      map.current.setView(
        [value.latitude, value.longitude],
        Math.max(map.current.getZoom(), 16),
      );
    }
  }, [value, ready]);
  return (
    <section aria-label="Choose mosque location" className="location-picker">
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
        <label htmlFor="place-search">Search mosque, street or city</label>
        <div className="search-row">
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
          <button className="button" disabled={busy || query.trim().length < 2}>
            Search places
          </button>
        </div>
      </form>
      <button
        type="button"
        className="button secondary"
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
        Use current location
      </button>
      <p role="status">{status}</p>
      {results.length > 0 && (
        <ul className="place-results">
          {results.map((p, i) => (
            <li key={i}>
              <button
                type="button"
                className="button secondary"
                onClick={() => onChange(p)}
              >
                {p.name || p.address || "Unnamed place"}
                {p.city ? `, ${p.city}` : ""}
                {p.countryCode ? `, ${p.countryCode}` : ""}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        ref={container}
        className="mosque-map"
        aria-label="Registration map"
      />
      {mapError && (
        <p role="status" className="notice">
          {mapError}
        </p>
      )}
      <p>
        Tap the map or drag the pin to the mosque entrance. Confirm the exact
        location before continuing.
      </p>
      <p className="muted">
        Place search by Photon / OpenStreetMap. Searches are sent to the
        provider. Map locations do not include verified Jamaat times.
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
        <p className="notice">
          Selected mosque location: {value.latitude.toFixed(6)},{" "}
          {value.longitude.toFixed(6)}
        </p>
      )}
    </section>
  );
}
