import type {
  DataMode,
  DiscoveryQuery,
  DiscoveryResponse,
} from "@/domain/discovery";
export async function fetchDiscovery(
  query: DiscoveryQuery,
  mode: DataMode,
  signal?: AbortSignal,
): Promise<DiscoveryResponse> {
  const response = await fetch("/api/discovery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, mode }),
    cache: "no-store",
    signal: signal ?? AbortSignal.timeout(15000),
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Could not load mosque information.",
    );
  return payload as DiscoveryResponse;
}
