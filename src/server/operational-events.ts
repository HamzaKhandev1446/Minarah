import "server-only";

export type OperationalEvent =
  | "discovery_unavailable"
  | "publication_failed"
  | "push_subscription_failed"
  | "push_dispatch_failed";

/** Deliberately accepts no error objects or payloads: logs cannot contain coordinates or secrets. */
export function reportOperationalEvent(event: OperationalEvent): string {
  const reference = crypto.randomUUID();
  console.error(
    JSON.stringify({ event, reference, at: new Date().toISOString() }),
  );
  return reference;
}
