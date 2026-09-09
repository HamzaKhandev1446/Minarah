"use client";
import { useEffect, useRef, useState } from "react";
import type { MosqueResult } from "@/domain/discovery";
import type { Map as LeafletMap } from "leaflet";
import type { SelectedPlace } from "@/lib/place-search";
const NO_PLACES: SelectedPlace[] = [];

export function MosqueMap({
  results,
  onSelect,
  center,
  places = NO_PLACES,
  onSelectPlace,
}: {
  results: MosqueResult[];
  onSelect: (result: MosqueResult) => void;
  center?: { latitude: number; longitude: number };
  places?: SelectedPlace[];
  onSelectPlace?: (place: SelectedPlace) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const select = useRef(onSelect);
  const selectPlace = useRef(onSelectPlace);
  useEffect(() => {
    select.current = onSelect;
    selectPlace.current = onSelectPlace;
  }, [onSelect, onSelectPlace]);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let disposed = false;
    let map: LeafletMap | undefined;
    let observer: ResizeObserver | undefined;
    void import("leaflet")
      .then((L) => {
        if (disposed || !container.current) return;
        map = L.map(container.current, { scrollWheelZoom: false });
        const tiles = L.tileLayer(
          process.env.NEXT_PUBLIC_MAP_TILE_URL ||
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        );
        tiles.on("tileerror", () => {
          if (!disposed)
            setError(
              "The map background could not load. You can still select a mosque below.",
            );
        });
        tiles.addTo(map);
        const points: [number, number][] = [];
        results.forEach((result, index) => {
          const point: [number, number] = [
            result.mosque.latitude,
            result.mosque.longitude,
          ];
          points.push(point);
          const marker = L.marker(point, {
            title: result.mosque.name,
            alt: `Show ${result.mosque.name} timetable`,
            icon: L.divIcon({
              className: "mosque-pin",
              html: `<span>${index + 1}</span>`,
              iconSize: [44, 44],
              iconAnchor: [22, 44],
            }),
          });
          marker.on("click", () => select.current(result));
          marker.addTo(map!);
        });
        places.forEach((place) => {
          const point: [number, number] = [place.latitude, place.longitude];
          points.push(point);
          L.marker(point, {
            title: place.name || "Map place",
            alt: `Show map place ${place.name}`,
            icon: L.divIcon({
              className: "mosque-pin place-pin",
              html: "<span>○</span>",
              iconSize: [44, 44],
              iconAnchor: [22, 44],
            }),
          })
            .on("click", () => selectPlace.current?.(place))
            .addTo(map!);
        });
        if (points.length === 1) map.setView(points[0]!, 15);
        else if (points.length)
          map.fitBounds(L.latLngBounds(points), {
            padding: [40, 40],
            maxZoom: 15,
          });
        else
          map.setView(
            center ? [center.latitude, center.longitude] : [30, 69],
            center ? 15 : 5,
          );
        observer = new ResizeObserver(() => map?.invalidateSize());
        observer.observe(container.current);
      })
      .catch(() => {
        if (!disposed)
          setError(
            "The map could not load. Select a mosque from the list below.",
          );
      });
    return () => {
      disposed = true;
      observer?.disconnect();
      map?.remove();
    };
  }, [results, retry, center, places]);
  return (
    <section className="map-panel" aria-label="Mosque map">
      <div
        ref={container}
        className="mosque-map"
        aria-label="Interactive mosque map"
      />
      <p className="muted">
        Map tiles by OpenStreetMap. Opening this map shares the viewed area with
        the tile provider. Markers show the search results below.
      </p>
      {error && (
        <p role="status" className="notice error">
          {error}{" "}
          <button
            className="button secondary"
            onClick={() => {
              setError("");
              setRetry((value) => value + 1);
            }}
          >
            Retry map
          </button>
        </p>
      )}
    </section>
  );
}
