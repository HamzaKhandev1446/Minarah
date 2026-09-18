"use client";
import { useEffect, useRef, useState } from "react";
import type { Map, Marker, GeoJSONSource } from "maplibre-gl";
import {
  currentSchedule,
  jamaatTimingState,
  type MosqueResult,
} from "@/domain/discovery";
import { formatClockTime, localJamaatInstant, PRAYER_LABELS } from "@/domain/schedule";
import type { SelectedPlace } from "@/lib/place-search";
import {
  initialMapBounds,
  mapRadiusRing,
  PILOT_MAP_CENTER,
} from "@/lib/map-viewport";

const EMPTY_RESULTS: MosqueResult[] = [];
const EMPTY_PLACES: SelectedPlace[] = [];

function minaretMarkerIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "minaret-marker-icon");
  svg.setAttribute("viewBox", "0 0 48 64");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const outline = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );
  outline.setAttribute(
    "d",
    "M15 60V32h18v28M12 32h24M14 27h20l-3-5H17l-3 5ZM18 22v-8l6-7 6 7v8M24 7V3M11 60h26M21 60V45a3 3 0 0 1 6 0v15",
  );
  svg.append(outline);

  const crescent = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );
  crescent.setAttribute("d", "M25 0a4 4 0 1 0 5 5 4.5 4.5 0 0 1-5-5Z");
  crescent.setAttribute("class", "minaret-marker-crescent");
  svg.append(crescent);
  return svg;
}

export interface OpenMapProps {
  results?: MosqueResult[];
  places?: SelectedPlace[];
  center?: { latitude: number; longitude: number };
  now?: string;
  selectedId?: string | null;
  onSelect?: (result: MosqueResult) => void;
  onSelectPlace?: (place: SelectedPlace) => void;
  onPick?: (latitude: number, longitude: number) => void;
  pickingLabel?: string;
}
export function OpenMap({
  results = EMPTY_RESULTS,
  places = EMPTY_PLACES,
  center,
  now,
  selectedId,
  onSelect,
  onSelectPlace,
  onPick,
  pickingLabel = "Registration map",
}: OpenMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<Map | null>(null);
  const markers = useRef<Marker[]>([]);
  const callbacks = useRef({ onSelect, onSelectPlace, onPick });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const fitted = useRef("");
  const minute = now?.slice(0, 16);
  const picking = !!onPick;
  useEffect(() => {
    callbacks.current = { onSelect, onSelectPlace, onPick };
  }, [onSelect, onSelectPlace, onPick]);
  useEffect(() => {
    let disposed = false;
    let map: Map | undefined;
    let observer: ResizeObserver | undefined;
    const timer = setTimeout(() => {
      if (!disposed) setError(true);
    }, 20000);
    void import("maplibre-gl")
      .then((library) => {
        if (disposed || !container.current) return;
        library.setWorkerUrl("/map-worker/maplibre-gl-worker.mjs");
        map = new library.Map({
          container: container.current,
          style: "https://tiles.openfreemap.org/styles/positron",
          bounds: initialMapBounds(PILOT_MAP_CENTER),
          fitBoundsOptions: { padding: 0 },
          attributionControl: false,
          scrollZoom: false,
          pitchWithRotate: false,
          dragRotate: false,
        });
        instance.current = map;
        map.addControl(
          new library.AttributionControl({ compact: true }),
          "bottom-right",
        );
        map.addControl(
          new library.NavigationControl({ showCompass: false }),
          "top-right",
        );
        map.on("click", (event) =>
          callbacks.current.onPick?.(event.lngLat.lat, event.lngLat.wrap().lng),
        );
        map.on("error", (event) => {
          container.current?.setAttribute(
            "data-map-error",
            event.error.message,
          );
          if (!disposed) setError(true);
        });
        map.on("load", () => {
          if (!disposed) {
            clearTimeout(timer);
            setError(false);
            container.current?.setAttribute("data-map-loaded", "true");
          }
        });
        map.on("idle", () => {
          if (!disposed && map?.areTilesLoaded()) setError(false);
        });
        observer = new ResizeObserver(() => map?.resize());
        observer.observe(container.current);
        setReady(true);
      })
      .catch(() => {
        if (!disposed) setError(true);
      });
    return () => {
      disposed = true;
      clearTimeout(timer);
      observer?.disconnect();
      map?.remove();
      instance.current = null;
      fitted.current = "";
    };
  }, [retry]);
  useEffect(() => {
    if (!ready || !instance.current) return;
    const map = instance.current;
    let disposed = false;
    let updateRadius: (() => void) | undefined;
    void import("maplibre-gl").then((library) => {
      if (disposed) return;
      const points: [number, number][] = [];
      const created: Marker[] = [];
      const add = (
        latitude: number,
        longitude: number,
        element: HTMLElement,
        draggable = false,
      ) => {
        const marker = new library.Marker({
          element,
          anchor: draggable ? "center" : "bottom",
          draggable,
        })
          .setLngLat([longitude, latitude])
          .addTo(map);
        if (draggable)
          marker.on("dragend", () => {
            const point = marker.getLngLat().wrap();
            callbacks.current.onPick?.(point.lat, point.lng);
          });
        created.push(marker);
        points.push([longitude, latitude]);
      };
      for (const result of results) {
        const clock = minute ? `${minute}:00.000Z` : null;
        const schedule = clock ? currentSchedule(result, clock) : null;
        const active =
          schedule && clock
            ? [...schedule.today.entries, ...schedule.fridaySessions]
                .map((entry) => ({
                  time: entry.localTime,
                  name: "prayer" in entry ? PRAYER_LABELS[entry.prayer] : "Jumuah",
                  state: jamaatTimingState(
                    localJamaatInstant(
                      schedule.today.localDate,
                      entry.localTime,
                      result.mosque.timezone,
                    )?.toString() ?? null,
                    clock,
                  ),
                }))
                .find((entry) => entry.state !== null)
            : null;
        const next = schedule?.next;
        const label = active
          ? formatClockTime(active.time)
          : next
            ? formatClockTime(next.jamaatLocalTime)
            : "No time";
        const button = document.createElement("button");
        const prayerName = active?.name ?? next?.label ?? "Jamaat";
        button.type = "button";
        button.className = `open-time-pin ${selectedId === result.mosque.id ? "is-selected" : ""} ${active?.state ? `is-${active.state}` : ""}`;
        const caption = document.createElement("span");
        caption.className = "map-prayer-caption";
        const name = document.createElement("span");
        name.className = "map-prayer-name";
        name.textContent = prayerName;
        const time = document.createElement("span");
        time.textContent = label;
        caption.append(name, time);
        button.append(minaretMarkerIcon(), caption);
        if (active?.state) {
          const status = document.createElement("span");
          status.className = "map-prayer-status";
          status.textContent =
            active.state === "live"
              ? "قَدْ قَامَتِ الصَّلَاةُ"
              : active.state === "nearly"
                ? "Starting soon"
                : "Started recently";
          if (active.state === "live") {
            status.lang = "ar";
            status.dir = "rtl";
          }
          button.append(status);
        }
        button.setAttribute(
          "aria-label",
          `Select ${result.mosque.name}, ${prayerName}, ${label}${active?.state ? `, ${active.state === "live" ? "Jamaat in progress" : active.state === "nearly" ? "starting soon" : "started recently"}` : ""}`,
        );
        button.setAttribute(
          "aria-pressed",
          String(selectedId === result.mosque.id),
        );
        button.onclick = (event) => {
          event.stopPropagation();
          callbacks.current.onSelect?.(result);
        };
        add(result.mosque.latitude, result.mosque.longitude, button);
      }
      for (const place of places) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "open-time-pin place-pin";
        button.textContent = place.name || "Map place";
        button.setAttribute("aria-label", `Select map place ${place.name}`);
        button.onclick = (event) => {
          event.stopPropagation();
          callbacks.current.onSelectPlace?.(place);
        };
        add(place.latitude, place.longitude, button);
      }
      if (center) {
        const dot = document.createElement("div");
        dot.className = picking
          ? "open-location-dot picking-pin"
          : "open-location-dot";
        dot.setAttribute("role", "img");
        dot.setAttribute(
          "aria-label",
          picking ? "Mosque location pin" : "Your location",
        );
        add(center.latitude, center.longitude, dot, picking);
      }
      markers.current = created;
      const focus =
        center ??
        (points[0]
          ? { longitude: points[0][0], latitude: points[0][1] }
          : PILOT_MAP_CENTER);
      const signature = JSON.stringify(focus);
      updateRadius = () => {
        if (disposed) return;
        const source = map.getSource<GeoJSONSource>("minarah-radius");
        if (source) source.setData(mapRadiusRing(focus));
        else {
          map.addSource("minarah-radius", {
            type: "geojson",
            data: mapRadiusRing(focus),
          });
          map.addLayer({
            id: "minarah-radius-fill",
            type: "fill",
            source: "minarah-radius",
            paint: { "fill-color": "#193f34", "fill-opacity": 0.035 },
          });
          map.addLayer({
            id: "minarah-radius-line",
            type: "line",
            source: "minarah-radius",
            paint: {
              "line-color": "#547b62",
              "line-width": 1.5,
              "line-dasharray": [3, 3],
            },
          });
        }
      };
      if (map.isStyleLoaded()) updateRadius();
      else map.once("load", updateRadius);
      if (fitted.current !== signature) {
        fitted.current = signature;
        map.fitBounds(initialMapBounds(focus), {
          padding: 0,
          duration: 0,
        });
      }
    });
    return () => {
      disposed = true;
      if (updateRadius) map.off("load", updateRadius);
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
    };
  }, [ready, retry, results, places, center, minute, selectedId, picking]);
  return (
    <section className="map-panel open-map-panel" aria-label="Mosque map">
      <div
        ref={container}
        className="mosque-map"
        aria-label={picking ? pickingLabel : "Interactive mosque map"}
      />
      {!picking && <span className="map-radius-label">0.8 km radius</span>}
      {error && (
        <div className="notice map-load-error" role="status">
          Map background unavailable. Search and mosque selection remain
          available.
          <button
            type="button"
            onClick={() => {
              setReady(false);
              setError(false);
              setRetry((value) => value + 1);
            }}
          >
            Retry map
          </button>
        </div>
      )}
    </section>
  );
}
