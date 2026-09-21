import { currentSchedule, type MosqueResult } from "./discovery";

export interface PushPreferences {
  enabled: boolean;
  reminders: boolean;
  changes: boolean;
  minutes: 5 | 10 | 15;
}
export interface PushCursor {
  publication?: string;
  reminder?: string;
}
export interface PushMessage {
  title: string;
  body: string;
  tag: string;
  url: string;
  ttl: number;
}

/** Plans one mosque at a time so successful deliveries can be checkpointed. */
export function planMosquePush(
  result: MosqueResult,
  now: string,
  preferences: PushPreferences,
  previous: PushCursor = {},
) {
  const cursor = { ...previous };
  const messages: PushMessage[] = [];
  if (!preferences.enabled || result.mosque.isSynthetic)
    return { cursor, messages };
  const { today, next } = currentSchedule(result, now);
  const url = `/mosques/${result.mosque.slug}`;
  if (today.publishedAt) {
    if (
      preferences.changes &&
      previous.publication &&
      previous.publication !== today.publishedAt
    )
      messages.push({
        title: `${result.mosque.name}: timetable updated`,
        body: "Open the mosque to see its latest published Jamaat times.",
        tag: `publication:${result.mosque.id}`,
        url,
        ttl: 3600,
      });
    cursor.publication = today.publishedAt;
  }
  if (
    preferences.reminders &&
    next &&
    next.timeRemainingMs > 0 &&
    next.timeRemainingMs <= preferences.minutes * 60000
  ) {
    const event = `${next.prayer}:${next.jamaatInstant}`;
    if (previous.reminder !== event) {
      messages.push({
        title: `${next.label} at ${result.mosque.name}`,
        body: `Jamaat starts in ${Math.ceil(next.timeRemainingMs / 60000)} minutes.`,
        tag: `reminder:${result.mosque.id}`,
        url,
        ttl: Math.max(1, Math.floor(next.timeRemainingMs / 1000)),
      });
      cursor.reminder = event;
    }
  }
  return { cursor, messages };
}
