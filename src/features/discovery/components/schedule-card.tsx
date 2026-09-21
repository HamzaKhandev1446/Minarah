"use client";
import Link from "next/link";
import { formatClockTime, PRAYER_LABELS } from "@/domain/schedule";
import {
  currentSchedule,
  remainingLabel,
  type DataMode,
  type MosqueResult,
} from "@/domain/discovery";
import { FollowButton } from "@/components/public-context";
import { formatHijriDate } from "@/lib/hijri-date";
export function ScheduleCard({
  result,
  now,
  mode,
  detail = false,
}: {
  result: MosqueResult;
  now: string;
  mode: DataMode;
  detail?: boolean;
}) {
  const { mosque } = result;
  const { today, next, fridaySessions } = currentSchedule(result, now);
  const distance = result.distanceMeters;
  const publication = today.publishedAt
    ? new Intl.DateTimeFormat("en", {
        timeZone: mosque.timezone,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(today.publishedAt))
    : null;
  const titleId = `mosque-${mosque.id}`;
  return (
    <article className="schedule-card" aria-labelledby={titleId}>
      <div className="card-heading">
        <div>
          <p className="eyebrow">
            {distance !== null
              ? `${distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`} away`
              : mosque.city}
          </p>
          <h2 id={titleId}>
            {detail ? (
              mosque.name
            ) : (
              <Link
                href={`/mosques/${mosque.slug}${mode === "demo" ? "?mode=demo" : ""}`}
              >
                {mosque.name}
              </Link>
            )}
          </h2>
        </div>
        <span className="status-badge">
          {mosque.isSynthetic ? "Fictional · " : ""}
          {mosque.verificationStatus === "verified"
            ? "Verified"
            : mosque.verificationStatus === "pending"
              ? "Verification pending"
              : "Unverified"}
        </span>
      </div>
      {mosque.isSynthetic && (
        <p className="sample-label">
          Fictional mosque and times. Do not use for prayer attendance.
        </p>
      )}
      <div className="next-jamaat">
        <div>
          <p className="eyebrow">
            Next Jamaat
            {next && next.date !== today.localDate ? " · Tomorrow" : ""}
          </p>
          <h3>{next?.label ?? "Not published"}</h3>
          <p className="jamaat-time">
            {next ? formatClockTime(next.jamaatLocalTime) : "—"}
          </p>
          <p className="countdown">
            {next
              ? remainingLabel(next.timeRemainingMs)
              : "No upcoming published Jamaat is available."}
          </p>
        </div>
        <span className="next-symbol" aria-hidden="true">
          ↗
        </span>
      </div>
      <div className="schedule-body">
        <div className="section-heading">
          <h3>Today’s Jamaat</h3>
          <span>{today.localDate} · mosque time</span>
        </div>
        <p
          className="hijri-date"
          title="Calculated Hijri date; local moon sighting may differ."
        >
          {formatHijriDate(now, mosque.timezone)} · Hijri (estimated)
        </p>
        {!today.entries.length && (
          <p className="muted">No schedule has been published for today.</p>
        )}
        <dl className="prayer-list">
          {today.entries.map((entry) => (
            <div
              key={entry.prayer}
              className={
                next?.date === today.localDate && next.prayer === entry.prayer
                  ? "up-next"
                  : ""
              }
            >
              <dt>
                {PRAYER_LABELS[entry.prayer]}
                {entry.prayer === "dhuhr" &&
                  today.jumuahSessions.length > 0 && (
                    <span className="next-label">Jumu’ah today</span>
                  )}
                {next?.date === today.localDate &&
                  next.prayer === entry.prayer && (
                    <span className="next-label">Next</span>
                  )}
              </dt>
              <dd>{formatClockTime(entry.localTime)}</dd>
            </div>
          ))}
        </dl>
        {fridaySessions.length > 0 && (
          <section className="friday">
            <h3>Friday Jumu’ah</h3>
            <p className="muted">
              On Fridays, these sessions replace Dhuhr in the next Jamaat
              display.
            </p>
            <dl className="prayer-list">
              {fridaySessions.map((session) => (
                <div key={session.position}>
                  <dt>{session.label || `Session ${session.position}`}</dt>
                  <dd>{formatClockTime(session.localTime)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        <p className="card-note">
          {publication ? (
            <>
              Last published{" "}
              <time dateTime={today.publishedAt!}>{publication}</time> (
              {mosque.timezone}).
            </>
          ) : (
            "No publication date is available for today."
          )}
        </p>
        <FollowButton id={mosque.id} mode={mode} />
        {detail && (
          <div className="address">
            <h3>Visit the mosque</h3>
            <p>
              {mosque.addressLine}, {mosque.locality}, {mosque.city},{" "}
              {mosque.countryCode}
            </p>
            {!mosque.isSynthetic && (
              <a
                className="button secondary"
                rel="noreferrer"
                target="_blank"
                href={`https://www.google.com/maps/dir/?api=1&destination=${mosque.latitude},${mosque.longitude}`}
              >
                Get directions
              </a>
            )}
            {!mosque.isSynthetic && (
              <p>
                <Link href={`/mosques/${mosque.slug}/claim`}>
                  Claim this mosque
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
