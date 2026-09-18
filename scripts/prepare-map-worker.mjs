import { copyFile, mkdir } from "node:fs/promises";
const destination = new URL("../public/map-worker/", import.meta.url);
await mkdir(destination, { recursive: true });
for (const name of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(
    new URL(`../node_modules/maplibre-gl/dist/${name}`, import.meta.url),
    new URL(name, destination),
  );
}
