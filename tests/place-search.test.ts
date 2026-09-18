import { afterEach, expect, it, vi } from "vitest";
import { placeSchema, searchPlaces, distinctPlaces } from "@/lib/place-search";
it("merges nearby duplicate provider pins without merging distant same-name mosques", () => {
  const base = placeSchema.parse({
    latitude: 33.729,
    longitude: 73.037,
    name: "Faisal Mosque",
  });
  expect(
    distinctPlaces([
      base,
      { ...base, latitude: 33.7291 },
      { ...base, latitude: 34 },
    ]),
  ).toEqual([base, { ...base, latitude: 34 }]);
});
import { parseSavedPlaces } from "@/lib/follows/places";
it("bounds and validates locally saved places", () => {
  expect(parseSavedPlaces("invalid")).toEqual([]);
  expect(
    parseSavedPlaces(
      JSON.stringify(
        Array.from({ length: 51 }, () => ({
          latitude: 24,
          longitude: 67,
          name: "Mosque",
        })),
      ),
    ),
  ).toEqual([]);
  expect(
    parseSavedPlaces(
      JSON.stringify([
        { latitude: 24, longitude: 67, name: "Mosque" },
        { latitude: 24, longitude: 67, name: "Mosque" },
      ]),
    ),
  ).toHaveLength(1);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("rejects invalid coordinates recovered from storage", () => {
  expect(placeSchema.safeParse({ latitude: 91, longitude: 67 }).success).toBe(
    false,
  );
  expect(
    placeSchema.safeParse({ latitude: 24, longitude: Infinity }).success,
  ).toBe(false);
});
it("maps bounded Photon results to editable location details", async () => {
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      features: [
        {
          geometry: { type: "Point", coordinates: [67, 24] },
          properties: {
            name: "Mosque",
            street: "Street",
            city: "Karachi",
            countrycode: "pk",
          },
        },
      ],
    }),
  });
  vi.stubGlobal("fetch", fetcher);
  const places = await searchPlaces("Mosque Karachi");
  expect(places).toEqual([
    {
      name: "Mosque",
      address: "Street",
      city: "Karachi",
      countryCode: "PK",
      latitude: 24,
      longitude: 67,
    },
  ]);
  expect(fetcher.mock.calls[0]![0].searchParams.get("limit")).toBe("5");
});
it("does not invent places when the provider fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  await expect(searchPlaces("Masjid")).rejects.toThrow("unavailable");
});
