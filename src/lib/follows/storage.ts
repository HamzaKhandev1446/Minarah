import { z } from "zod";
import type { DataMode } from "@/domain/discovery";
export const FOLLOW_EVENT = "minarah:follows";
export const followsKey = (mode: DataMode) => `minarah:follows:v1:${mode}`;
const idsSchema = z.array(z.uuid()).max(50);
export function parseFollows(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = idsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? [...new Set(parsed.data)] : [];
  } catch {
    return [];
  }
}
export function toggleFollow(
  storage: Pick<Storage, "getItem" | "setItem">,
  mode: DataMode,
  id: string,
) {
  z.uuid().parse(id);
  const key = followsKey(mode);
  const ids = parseFollows(storage.getItem(key));
  const next = ids.includes(id)
    ? ids.filter((value) => value !== id)
    : [...ids, id];
  if (next.length > 50)
    throw new Error("You can follow up to 50 mosques on this browser.");
  storage.setItem(key, JSON.stringify(next));
  return next;
}
