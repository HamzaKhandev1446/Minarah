import { expect, it } from "vitest";
import { readNotificationPreferences } from "@/lib/notification-preferences";
it("requires opt-in and rejects malformed preferences", () => {
  expect(readNotificationPreferences(null).enabled).toBe(false);
  expect(readNotificationPreferences('{"minutes":-1,"enabled":true}').enabled).toBe(false);
});
it("keeps alert types independently configurable", () => {
  expect(readNotificationPreferences('{"enabled":true,"reminders":false,"changes":true,"minutes":15}'))
    .toEqual({enabled:true, reminders:false, changes:true, minutes:15});
});
