import { z } from "zod";
import { placeSchema, type SelectedPlace } from "@/lib/place-search";
export const savedPlacesKey = "minarah:saved-places:v1";
export const placeKey = (p: SelectedPlace) =>
  `${p.latitude.toFixed(6)}:${p.longitude.toFixed(6)}:${p.name}`;
export function parseSavedPlaces(raw: string | null): SelectedPlace[] {
  try {
    const parsed = z
      .array(placeSchema)
      .max(50)
      .safeParse(JSON.parse(raw || "[]"));
    return parsed.success
      ? [...new Map(parsed.data.map((p) => [placeKey(p), p])).values()]
      : [];
  } catch {
    return [];
  }
}
