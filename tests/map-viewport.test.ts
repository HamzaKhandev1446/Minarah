import { describe, expect, it } from "vitest";
import {
  initialMapBounds,
  mapRadiusRing,
  PILOT_MAP_CENTER,
} from "@/lib/map-viewport";

describe("initial map coverage", () => {
  it("covers 0.8 kilometres from the chosen centre in each direction", () => {
    const [southwest, northeast] = initialMapBounds(PILOT_MAP_CENTER);
    const northMeters =
      (((northeast[1] - PILOT_MAP_CENTER.latitude) * Math.PI) / 180) *
      6371008.8;
    expect(northMeters).toBeCloseTo(800, 5);
    expect((southwest[0] + northeast[0]) / 2).toBeCloseTo(
      PILOT_MAP_CENTER.longitude,
      8,
    );
  });
  it("draws a closed circle whose vertices are each 800 metres from the centre", () => {
    const ring = mapRadiusRing(PILOT_MAP_CENTER).geometry.coordinates[0];
    expect(ring[0]).toEqual(ring.at(-1));
    const radians = Math.PI / 180;
    for (const [longitude, latitude] of ring) {
      const differenceLatitude =
        (latitude - PILOT_MAP_CENTER.latitude) * radians;
      const differenceLongitude =
        (longitude - PILOT_MAP_CENTER.longitude) * radians;
      const haversine =
        Math.sin(differenceLatitude / 2) ** 2 +
        Math.cos(latitude * radians) *
          Math.cos(PILOT_MAP_CENTER.latitude * radians) *
          Math.sin(differenceLongitude / 2) ** 2;
      expect(2 * 6371008.8 * Math.asin(Math.sqrt(haversine))).toBeCloseTo(
        800,
        5,
      );
    }
  });
});
