import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir(new URL("../public/icons/", import.meta.url), { recursive: true });
for (const [filename, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["maskable-512.png", 512],
]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#174f46"/><g fill="none" stroke="#f7f8f4" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"><path d="M166 362V208L256 136L346 208V362M256 136V362M207 362H305"/></g></svg>`;
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(
      new URL(`../public/icons/${filename}`, import.meta.url).pathname.replace(
        /^\/(?=[A-Za-z]:)/,
        "",
      ),
    );
}
