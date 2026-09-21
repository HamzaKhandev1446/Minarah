export const PUSH_DEVICE_KEY = "minarah:push-device:v1";
export function backgroundPushRegistered(storage: Pick<Storage, "getItem">): boolean {
  try { return JSON.parse(storage.getItem(PUSH_DEVICE_KEY) || "{}").registered === true; }
  catch { return false; }
}
