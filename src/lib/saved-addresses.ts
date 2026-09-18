import { z } from "zod";
export const SAVED_ADDRESSES_KEY = "minarah:saved-addresses:v1";
export const savedAddressSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["home", "work", "other"]),
  label: z.string().trim().min(1).max(60),
  address: z.string().trim().max(250),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});
export type SavedAddress = z.infer<typeof savedAddressSchema>;
export function parseSavedAddresses(raw: string | null): SavedAddress[] {
  try {
    const parsed = z
      .array(savedAddressSchema)
      .max(20)
      .safeParse(JSON.parse(raw ?? "[]"));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}
