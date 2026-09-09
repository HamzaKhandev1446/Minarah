import { z } from "zod";
import type { DataMode } from "@/domain/discovery";
import { followsKey, parseFollows } from "./storage";

export const opensKey = (mode: DataMode) => `minarah:opens:v1:${mode}`;
const countsSchema = z.record(z.uuid(), z.number().int().min(0).max(1000000));
export function parseOpens(raw: string | null): Record<string, number> {
  try {
    const value = countsSchema.safeParse(JSON.parse(raw ?? "{}"));
    return value.success && Object.keys(value.data).length <= 50
      ? value.data
      : {};
  } catch {
    return {};
  }
}
export function recordOpen(
  storage: Pick<Storage, "getItem" | "setItem">,
  mode: DataMode,
  id: string,
) {
  const ids = parseFollows(storage.getItem(followsKey(mode)));
  if (!ids.includes(id)) return;
  const previous = parseOpens(storage.getItem(opensKey(mode)));
  const next = Object.fromEntries(ids.map((key) => [key, previous[key] ?? 0]));
  next[id] = Math.min((next[id] ?? 0) + 1, 1000000);
  storage.setItem(opensKey(mode), JSON.stringify(next));
}
export function rankFollowed<T extends { mosque: { id: string } }>(
  results: T[],
  ids: string[],
  counts: Record<string, number>,
): T[] {
  return results
    .filter((result) => ids.includes(result.mosque.id))
    .sort(
      (a, b) =>
        (counts[b.mosque.id] ?? 0) - (counts[a.mosque.id] ?? 0) ||
        ids.indexOf(a.mosque.id) - ids.indexOf(b.mosque.id),
    );
}
