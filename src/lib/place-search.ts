import { z } from "zod";

export const placeSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  name: z.string().max(160).default(""),
  address: z.string().max(300).default(""),
  city: z.string().max(120).default(""),
  countryCode: z.string().max(2).default(""),
});
export type SelectedPlace = z.infer<typeof placeSchema>;
export function distinctPlaces(places: SelectedPlace[]): SelectedPlace[] {
  return places.filter(
    (place, index) =>
      !places.slice(0, index).some((other) => {
        if (
          !place.name ||
          place.name.trim().toLowerCase() !== other.name.trim().toLowerCase()
        )
          return false;
        const latitude = (place.latitude - other.latitude) * 111320;
        const longitude =
          (place.longitude - other.longitude) *
          111320 *
          Math.cos((place.latitude * Math.PI) / 180);
        return Math.hypot(latitude, longitude) < 250;
      }),
  );
}
const responseSchema = z.object({
  features: z
    .array(
      z.object({
        geometry: z.object({
          type: z.literal("Point"),
          coordinates: z.tuple([z.number(), z.number()]),
        }),
        properties: z.object({
          name: z.string().optional(),
          street: z.string().optional(),
          housenumber: z.string().optional(),
          city: z.string().optional(),
          district: z.string().optional(),
          countrycode: z.string().optional(),
        }),
      }),
    )
    .max(50),
});

// Explicit searches only; bounded results and a replaceable Photon provider.
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<SelectedPlace[]> {
  const url = new URL(
    process.env.NEXT_PUBLIC_GEOCODER_URL || "https://photon.komoot.io/api/",
  );
  url.searchParams.set("q", query.trim().slice(0, 120));
  url.searchParams.set("limit", "5");
  const response = await fetch(url, { signal });
  if (!response.ok)
    throw new Error(
      "Place search is unavailable. Try again or place the pin manually.",
    );
  const places = responseSchema
    .parse(await response.json())
    .features.slice(0, 5)
    .map(({ geometry, properties: p }) =>
      placeSchema.parse({
        latitude: geometry.coordinates[1],
        longitude: geometry.coordinates[0],
        name: (p.name || "").slice(0, 160),
        address: [p.housenumber, p.street]
          .filter(Boolean)
          .join(" ")
          .slice(0, 300),
        city: (p.city || p.district || "").slice(0, 120),
        countryCode: (p.countrycode || "").toUpperCase(),
      }),
    );
  return distinctPlaces(places);
}
