"use client";
import Link from "next/link";
import {
  formatPublishedAt,
  remainingLabel,
  type MosqueResult,
  type DataMode,
} from "@/domain/discovery";
import { formatClockTime } from "@/domain/schedule";
import { useFollows } from "@/components/public-context";
import { UiIcon } from "@/components/ui-icon";
import { FOLLOW_EVENT, toggleFollow } from "@/lib/follows/storage";
import { mosqueTimetable, LIVE_JAMAAT_LABEL } from "@/domain/timetable";

export function NearbyMosqueList({
  results,
  now,
  mode,
  selectedId,
  onSelect,
}: {
  results: MosqueResult[];
  now: string;
  mode: DataMode;
  selectedId: string | null;
  onSelect: (result: MosqueResult) => void;
}) {
  const { ids } = useFollows(mode);
  return (
    <section className="nearby-mosque-list" aria-label="Mosques nearby">
      {results.map((result) => {
        const { today, next, columns, activeColumn, highlightedState } =
          mosqueTimetable(result, now);
        return (
          <article
            key={result.mosque.id}
            className={`nearby-mosque-row ${selectedId === result.mosque.id ? "is-selected" : ""}`}
            aria-label={`${result.mosque.name} Jamaat times`}
            onClick={() => onSelect(result)}
          >
            <div className="nearby-mosque-heading">
              <div>
                <h2>{result.mosque.name}</h2>
                <p className="nearby-mosque-meta">
                  {result.mosque.verificationStatus === "verified"
                    ? "Verified"
                    : "Not verified"}
                  {result.distanceMeters !== null &&
                    ` · ${(result.distanceMeters / 1000).toFixed(1)} km`}
                </p>
              </div>
              <button
                className="favourite-heart"
                aria-label={`${ids.includes(result.mosque.id) ? "Remove" : "Add"} ${result.mosque.name} ${ids.includes(result.mosque.id) ? "from" : "to"} favourites`}
                aria-pressed={ids.includes(result.mosque.id)}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFollow(localStorage, mode, result.mosque.id);
                  window.dispatchEvent(new Event(FOLLOW_EVENT));
                }}
              >
                <UiIcon name="heart" />
              </button>
            </div>
            <div className="preview-next nearby-next">
              <div>
                <span>
                  NEXT JAMAAT
                  {next && next.date !== today.localDate ? " · TOMORROW" : ""}
                </span>
                <strong>{next?.label ?? "Awaiting publication"}</strong>
              </div>
              <div>
                <b>{next ? formatClockTime(next.jamaatLocalTime) : "—"}</b>
                <small>
                  {next
                    ? remainingLabel(next.timeRemainingMs)
                    : "No published time"}
                </small>
              </div>
            </div>
            <div className="jamaat-time-grid">
              {columns.map((column) => {
                const { state, isFridayDhuhr } = column;
                return (
                  <div
                    className={`jamaat-time-cell ${state ? `is-${state}` : ""} ${column.isEmphasized ? "is-next" : ""}`}
                    key={column.key}
                    title={column.english}
                  >
                    <span lang="ar" className="jamaat-arabic">
                      {column.arabic}
                    </span>
                    <span className="jamaat-english">{column.english}</span>
                    {isFridayDhuhr && (
                      <small className="jummah-badge">Jummah</small>
                    )}
                    {state === "live" && (
                      <span className="qad-label is-live" lang="ar" dir="rtl">
                        {LIVE_JAMAAT_LABEL}
                      </span>
                    )}
                    <strong>
                      {column.localTime
                        ? formatClockTime(column.localTime)
                        : "—"}
                    </strong>
                  </div>
                );
              })}
            </div>
            {activeColumn && highlightedState && (
              <p className="jamaat-state" role="status">
                {activeColumn.key === "jumuah"
                  ? "Jumuah"
                  : activeColumn.english}{" "}
                {highlightedState === "live"
                  ? "is in progress"
                  : highlightedState === "recent"
                    ? "started recently"
                    : "is nearly starting"}
              </p>
            )}
            <Link
              className="nearby-view-mosque"
              href={`/mosques/${result.mosque.slug}${mode === "demo" ? "?mode=demo" : ""}`}
              onClick={(event) => event.stopPropagation()}
            >
              View mosque <UiIcon name="arrow" size={15} />
            </Link>
            <p className="schedule-freshness">
              {formatPublishedAt(today.publishedAt, result.mosque.timezone)}
            </p>
          </article>
        );
      })}
    </section>
  );
}
