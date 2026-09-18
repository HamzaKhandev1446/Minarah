import "server-only";
import { createClient } from "@supabase/supabase-js";
import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";
import { getSupabaseConfig, getNearbyRadiusMeters } from "@/lib/config";
import { getSampleData } from "@/data/sample";
import {
  discoveryQuerySchema,
  type DataMode,
  type DiscoveryQuery,
  type DiscoveryResponse,
} from "@/domain/discovery";
import { mapMosque, mapSchedule } from "./public-mappers";

export class DirectoryUnavailable extends Error {}
const columns =
  "id,slug,name,address_line,locality,city,country_code,latitude,longitude,timezone,verification_status,is_synthetic";

// Used only for the ten fictional demo records, on the server. Live proximity
// always uses the indexed PostGIS RPC; visitor coordinates are never stored.
function demoDistance(
  lat: number,
  lng: number,
  targetLat: number,
  targetLng: number,
) {
  const radians = Math.PI / 180;
  const a =
    Math.sin(((targetLat - lat) * radians) / 2) ** 2 +
    Math.cos(lat * radians) *
      Math.cos(targetLat * radians) *
      Math.sin(((targetLng - lng) * radians) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function discoverMosques(
  input: DiscoveryQuery,
  mode: DataMode,
  now = new Date().toISOString(),
): Promise<DiscoveryResponse> {
  const query = discoveryQuerySchema.parse(input);
  const radiusMeters = getNearbyRadiusMeters();
  if (mode === "demo") {
    const sample = getSampleData(now);
    let results = sample.mosques
      .filter((m) => m.verificationStatus !== "rejected")
      .map((mosque) => ({
        mosque,
        schedules: sample.schedules.filter(
          (s) => s.mosqueId === mosque.id && s.status === "published",
        ),
        distanceMeters:
          query.kind === "nearby"
            ? demoDistance(
                query.latitude,
                query.longitude,
                mosque.latitude,
                mosque.longitude,
              )
            : query.kind === "detail" && query.coordinates
              ? demoDistance(
                  query.coordinates.latitude,
                  query.coordinates.longitude,
                  mosque.latitude,
                  mosque.longitude,
                )
              : null,
      }));
    if (query.kind === "nearby")
      results = results
        .filter((r) => r.distanceMeters! <= radiusMeters)
        .sort((a, b) => a.distanceMeters! - b.distanceMeters!);
    if (query.kind === "search")
      results = results.filter((r) =>
        `${r.mosque.name} ${r.mosque.city} ${r.mosque.locality}`
          .toLowerCase()
          .includes(query.query.toLowerCase()),
      );
    if (query.kind === "detail")
      results = results.filter((r) => r.mosque.slug === query.slug);
    if (query.kind === "followed")
      results = results.filter((r) => query.ids.includes(r.mosque.id));
    return { results: results.slice(0, 50), fetchedAt: now, radiusMeters };
  }
  const config = getSupabaseConfig();
  if (!config)
    throw new DirectoryUnavailable(
      "Live mosque information is not connected yet. You can explore the clearly labelled demo.",
    );
  // Deliberately no user cookies/session: public reads must remain anonymous,
  // including when an administrator uses the public directory.
  const db = createClient(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (url, init) =>
        fetch(url, {
          ...init,
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        }),
    },
  });
  const distances = new Map<string, number>();
  let ids: string[] | null = null;
  if (query.kind === "nearby") {
    const { data, error } = await db.rpc("nearby_mosques", {
      lat: query.latitude,
      lng: query.longitude,
      radius_meters: radiusMeters,
      result_limit: 20,
    });
    if (error)
      throw new DirectoryUnavailable(
        "Nearby mosques could not be loaded. Please try again or search manually.",
      );
    const nearby = z
      .array(
        z.object({ id: z.uuid(), distance_meters: z.number().nonnegative() }),
      )
      .parse(data);
    nearby.forEach((row) => distances.set(row.id, row.distance_meters));
    ids = nearby.map((row) => row.id);
  } else if (query.kind === "followed") ids = query.ids;
  if (ids?.length === 0) return { results: [], fetchedAt: now, radiusMeters };
  const request =
    query.kind === "search"
      ? db
          .rpc("search_mosques", { query: query.query, result_limit: 20 })
          .select(columns)
      : db
          .from("mosques")
          .select(columns)
          .neq("verification_status", "rejected");
  if (ids) request.in("id", ids);
  if (query.kind === "detail") request.eq("slug", query.slug);
  const { data, error } = await request.limit(50);
  if (error)
    throw new DirectoryUnavailable(
      "Mosque information could not be loaded. Please try again.",
    );
  const mosques = z.array(z.unknown()).parse(data).map(mapMosque);
  if (!mosques.length) return { results: [], fetchedAt: now, radiusMeters };
  const utcDate = Temporal.Instant.from(now)
    .toZonedDateTimeISO("UTC")
    .toPlainDate();
  const { data: scheduleData, error: scheduleError } = await db
    .from("jamaat_schedules")
    .select(
      "id,mosque_id,effective_from,effective_to,status,revision,published_at,jamaat_schedule_entries(prayer,local_time),jumuah_sessions(position,local_time,label),schedule_overrides(local_date,prayer,local_time)",
    )
    .in(
      "mosque_id",
      mosques.map((m) => m.id),
    )
    .eq("status", "published")
    .lte("effective_from", utcDate.add({ days: 2 }).toString())
    .or(
      `effective_to.is.null,effective_to.gte.${utcDate.subtract({ days: 1 }).toString()}`,
    )
    .limit(250);
  if (scheduleError)
    throw new DirectoryUnavailable(
      "Published schedules could not be loaded. Please try again.",
    );
  const schedules = z.array(z.unknown()).parse(scheduleData).map(mapSchedule);
  if (query.kind === "detail" && query.coordinates && mosques[0]) {
    const { data: distance, error: distanceError } = await db.rpc(
      "mosque_distance",
      {
        target_mosque: mosques[0].id,
        lat: query.coordinates.latitude,
        lng: query.coordinates.longitude,
      },
    );
    if (distanceError)
      throw new DirectoryUnavailable(
        "Distance could not be loaded. Please try again.",
      );
    if (distance !== null)
      distances.set(mosques[0].id, z.number().nonnegative().parse(distance));
  }
  const results = mosques.map((mosque) => ({
    mosque,
    schedules: schedules.filter((s) => s.mosqueId === mosque.id),
    distanceMeters: distances.get(mosque.id) ?? null,
  }));
  if (query.kind === "nearby")
    results.sort((a, b) => a.distanceMeters! - b.distanceMeters!);
  return { results, fetchedAt: now, radiusMeters };
}
