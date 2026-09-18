export const INITIAL_MAP_RADIUS_METERS = 800;
export const PILOT_MAP_CENTER = {
  latitude: 24.87114689030473,
  longitude: 67.0243783185695,
};

export function initialMapBounds(center: {
  latitude: number;
  longitude: number;
}): [[number, number], [number, number]] {
  const coordinates = mapRadiusRing(center).geometry.coordinates[0];
  return [
    [
      Math.min(...coordinates.map((point) => point[0])),
      Math.min(...coordinates.map((point) => point[1])),
    ],
    [
      Math.max(...coordinates.map((point) => point[0])),
      Math.max(...coordinates.map((point) => point[1])),
    ],
  ];
}

export function mapRadiusRing(center: { latitude: number; longitude: number }) {
  const radians = Math.PI / 180;
  const latitude = Math.max(-85, Math.min(85, center.latitude)) * radians;
  const longitude = center.longitude * radians;
  const angularDistance = INITIAL_MAP_RADIUS_METERS / 6371008.8;
  const coordinates: [number, number][] = [];
  for (let index = 0; index < 128; index++) {
    const bearing = (index * 2 * Math.PI) / 128;
    const targetLatitude = Math.asin(
      Math.sin(latitude) * Math.cos(angularDistance) +
        Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const targetLongitude =
      longitude +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
        Math.cos(angularDistance) -
          Math.sin(latitude) * Math.sin(targetLatitude),
      );
    coordinates.push([targetLongitude / radians, targetLatitude / radians]);
  }
  coordinates.push(coordinates[0]!);
  return {
    type: "Feature" as const,
    properties: { radiusMeters: INITIAL_MAP_RADIUS_METERS },
    geometry: {
      type: "Polygon" as const,
      coordinates: [coordinates] as [[number, number][]],
    },
  };
}
