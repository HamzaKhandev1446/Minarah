import type {
  DataMode,
  DiscoveryQuery,
  DiscoveryResponse,
} from "@/domain/discovery";
import { discoveryResponseSchema } from "./discovery-response";
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
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Could not load mosque information. Please try again.");
  }
  if (!response.ok)
    throw new Error(
      payload !== null &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof payload.error === "string"
        ? payload.error
        : "Could not load mosque information.",
    );
  const parsed = discoveryResponseSchema.safeParse(payload);
  if (!parsed.success)
    throw new Error(
      "Mosque information is temporarily unavailable. Please try again.",
    );
  return parsed.data;
}
