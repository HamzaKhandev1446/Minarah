import { formatClockTime, PRAYER_LABELS } from "@/domain/schedule";
import type {
  ScheduleEntry,
  JumuahSession,
  ScheduleOverride,
} from "@/domain/types";

export function SchedulePreview({
  entries,
  jumuahSessions,
  overrides,
}: {
  entries: ScheduleEntry[];
  jumuahSessions: JumuahSession[];
  overrides: ScheduleOverride[];
}) {
  return (
    <section
      className="schedule-publish-preview"
      aria-labelledby="publication-preview-title"
    >
      <h3 id="publication-preview-title">Review your Jamaat times</h3>
      <p>
        All times use the mosque’s local clock. These will be visible to
        everyone after you confirm.
      </p>
      <dl>
        {entries.map((entry) => (
          <div key={entry.prayer}>
            <dt>{PRAYER_LABELS[entry.prayer]}</dt>
            <dd>{formatClockTime(entry.localTime)}</dd>
          </div>
        ))}
      </dl>
      <h4>Friday Jumuah</h4>
      {jumuahSessions.length ? (
        <ol>
          {jumuahSessions.map((session) => (
            <li key={session.position}>
              {session.label || `Session ${session.position}`}:{" "}
              <strong>{formatClockTime(session.localTime)}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p>No Jumuah sessions entered.</p>
      )}
      {overrides.length > 0 && (
        <>
          <h4>Date-specific changes</h4>
          <ul>
            {overrides.map((override) => (
              <li key={`${override.localDate}:${override.prayer}`}>
                {override.localDate} · {PRAYER_LABELS[override.prayer]}:{" "}
                <strong>{formatClockTime(override.localTime)}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
      <p>
        Publishing replaces overlapping current and planned timetables. Previous
        publications remain in the history.
      </p>
    </section>
  );
}
