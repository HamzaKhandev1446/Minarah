"use client";
import Link from "next/link";
import {
  currentSchedule,
  remainingLabel,
  type MosqueResult,
  type DataMode,
} from "@/domain/discovery";
import { formatClockTime, PRAYER_LABELS } from "@/domain/schedule";
import { PRAYERS } from "@/domain/types";
import { FollowButton } from "./public-context";
import { formatHijriDate } from "@/lib/hijri-date";
import { UiIcon } from "./ui-icon";

export function MosqueBoard({
  result,
  now,
  mode,
}: {
  result: MosqueResult;
  now: string;
  mode: DataMode;
}) {
  const { mosque } = result;
  const { today, next, fridaySessions, publishedJumuahSessions } =
    currentSchedule(result, now);
  const instant = new Date(now);
  const options = { timeZone: mosque.timezone };
  return (
    <article className="mosque-board" aria-label={`${mosque.name} timetable`}>
      <div className="board-back-row">
        <Link
          className="board-back-button"
          href={mode === "demo" ? "/?mode=demo" : "/"}
          aria-label="Back to nearby mosques"
          title="Back to nearby mosques"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m12 5-7 7 7 7M5 12h15" />
          </svg>
        </Link>
      </div>
      <header className="board-header">
        <div>
          <p className="eyebrow">
            {mosque.verificationStatus === "verified"
              ? "Verified mosque"
              : "Unverified mosque"}
          </p>
          <div className="board-name-row">
            <a
              className="board-directions"
              aria-label={`Get directions to ${mosque.name}`}
              title="Get directions"
              href={`https://www.google.com/maps/dir/?api=1&destination=${mosque.latitude},${mosque.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <UiIcon name="pin" size={21} />
            </a>
            <h2>{mosque.name}</h2>
          </div>
          {result.distanceMeters !== null && (
            <p>
              {`${result.distanceMeters < 1000 ? `${Math.round(result.distanceMeters)} m` : `${(result.distanceMeters / 1000).toFixed(1)} km`} away`}
            </p>
          )}
        </div>
        <div className="board-clock">
          <time dateTime={now}>
            {new Intl.DateTimeFormat("en", {
              ...options,
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }).format(instant)}
          </time>
          <div className="board-dates">
            <p>
              {new Intl.DateTimeFormat("en", {
                ...options,
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(instant)}
            </p>
            <p
              lang="ar"
              dir="rtl"
              className="hijri-date"
              title="Calculated Hijri date; local moon sighting may differ."
            >
              {formatHijriDate(now, mosque.timezone)} (تقريبي)
            </p>
          </div>
        </div>
      </header>
      {mosque.isSynthetic && (
        <p className="board-demo">
          Fictional mosque and times. Do not use for prayer attendance.
        </p>
      )}
      <div className="board-main">
        <section aria-label="Today's Jamaat">
          <h3 className="board-section-title">Today’s Jamaat</h3>
          <dl className="board-prayers">
            {PRAYERS.map((prayer) => {
              const entry = today.entries.find(
                (item) => item.prayer === prayer,
              );
              const highlighted =
                next?.date === today.localDate &&
                (next.prayer === prayer ||
                  (prayer === "dhuhr" && next.prayer === "jumuah"));
              return (
                <div key={prayer} className={highlighted ? "board-active" : ""}>
                  <dt>
                    {PRAYER_LABELS[prayer]}
                    {highlighted && <small>Next</small>}
                    {prayer === "dhuhr" && today.jumuahSessions.length > 0 && (
                      <small className="jummah-badge">Jummah</small>
                    )}
                  </dt>
                  <dd>
                    {prayer === "dhuhr" && fridaySessions.length > 0
                      ? fridaySessions
                          .map((session) => formatClockTime(session.localTime))
                          .join(" · ")
                      : entry
                        ? formatClockTime(entry.localTime)
                        : "Not published"}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
        <section className="board-next" aria-label="Next Jamaat">
          <h3>
            Next Jamaat
            {next && next.date !== today.localDate ? " · Tomorrow" : ""}
          </h3>
          <p className="board-next-name">{next?.label ?? "Not published"}</p>
          <p className="board-next-time">
            {next ? formatClockTime(next.jamaatLocalTime) : "—"}
          </p>
          <p>
            {next
              ? remainingLabel(next.timeRemainingMs)
              : "No upcoming published Jamaat is available."}
          </p>
        </section>
      </div>
      <section className="board-friday" aria-label="Friday Jumu’ah">
        <h3>Jumu’ah</h3>
        {publishedJumuahSessions.length ? (
          <div>
            {publishedJumuahSessions.map((session) => (
              <span key={session.position}>
                {session.label && <small>{session.label} </small>}
                {formatClockTime(session.localTime)}
              </span>
            ))}
          </div>
        ) : (
          <p>Not published</p>
        )}
      </section>
      <footer className="board-footer">
        <p>
          {today.publishedAt
            ? `Last published ${new Intl.DateTimeFormat("en", { ...options, dateStyle: "medium", timeStyle: "short" }).format(new Date(today.publishedAt))}`
            : "No schedule has been published for today."}
        </p>
        <p className="board-caption">Illustrative mosque backdrop</p>
        <FollowButton id={mosque.id} mode={mode} />
        <Link
          className="board-details-link"
          href={`/mosques/${mosque.slug}${mode === "demo" ? "?mode=demo" : ""}`}
        >
          Mosque details & directions
        </Link>
      </footer>
    </article>
  );
}
