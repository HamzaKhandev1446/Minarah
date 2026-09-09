/** Canonical URLs must come from configuration, never forwarded Host headers. */
export function parseSiteOrigin(
  value: string | undefined,
  publicDeployment = false,
): string {
  if (!value)
    throw new Error(
      "Set NEXT_PUBLIC_SITE_URL to the canonical Minarah origin.",
    );
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" && !local) ||
    (publicDeployment && (local || url.protocol !== "https:"))
  )
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be an HTTPS origin without a path, query or credentials (HTTP loopback is allowed only locally).",
    );
  return url.origin;
}

export function siteOrigin(): string {
  return parseSiteOrigin(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.NODE_ENV !== "production"
        ? "http://localhost:3000"
        : undefined),
    process.env.VERCEL === "1" || process.env.MINARAH_RELEASE === "1",
  );
}
