/** Civil Hijri calendar estimate; local moon-sighting dates may differ. */
export function formatHijriDate(instant: string, timezone: string): string {
  return new Intl.DateTimeFormat("ar-u-ca-islamic-civil", {
    timeZone: timezone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(instant));
}
