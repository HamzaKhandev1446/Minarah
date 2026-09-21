import { z } from "zod";
import { discoveryQuerySchema } from "@/domain/discovery";
import { DirectoryUnavailable, discoverMosques } from "@/server/mosques";
import { reportOperationalEvent } from "@/server/operational-events";

const requestSchema = z.object({
  mode: z.enum(["live", "demo"]),
  query: discoveryQuerySchema,
});
const headers = { "Cache-Control": "private, no-store", Vary: "Origin" };
export async function POST(request: Request) {
  // POST keeps coordinates out of URLs/history/access-log query strings.
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  let sameOrigin = true;
  if (origin) {
    try {
      const originUrl = new URL(origin);
      // Next may use an internal hostname in request.url. The incoming Host
      // identifies the browser-facing host, including its development port.
      const host = request.headers.get("host") ?? requestUrl.host;
      const protocol =
        request.headers.get("x-forwarded-proto") ??
        requestUrl.protocol.slice(0, -1);
      sameOrigin =
        originUrl.host === host && originUrl.protocol === `${protocol}:`;
    } catch {
      sameOrigin = false;
    }
  }
  if (!sameOrigin)
    return Response.json(
      { error: "Cross-origin requests are not supported." },
      { status: 403, headers },
    );
  try {
    const body = await request.text();
    if (body.length > 8192)
      return Response.json(
        { error: "Request is too large." },
        { status: 413, headers },
      );
    const parsed = requestSchema.safeParse(JSON.parse(body));
    if (!parsed.success)
      return Response.json(
        {
          error: "Check your search, mosque IDs or coordinates and try again.",
        },
        { status: 400, headers },
      );
    return Response.json(
      await discoverMosques(parsed.data.query, parsed.data.mode),
      { headers },
    );
  } catch (error) {
    if (error instanceof SyntaxError)
      return Response.json(
        { error: "Invalid request." },
        { status: 400, headers },
      );
    const reference = reportOperationalEvent("discovery_unavailable");
    return Response.json(
      {
        error:
          error instanceof DirectoryUnavailable
            ? error.message
            : "Mosque information is temporarily unavailable. Please try again.",
      },
      { status: 503, headers: { ...headers, "X-Request-Id": reference } },
    );
  }
}
