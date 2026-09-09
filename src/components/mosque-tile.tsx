"use client";
import {
  currentSchedule,
  remainingLabel,
  type MosqueResult,
  type DataMode,
} from "@/domain/discovery";
import { formatClockTime } from "@/domain/schedule";
import { FollowButton } from "./public-context";
export function MosqueTile({
  result,
  now,
  mode,
  onOpen,
  favourite,
}: {
  result: MosqueResult;
  now: string;
  mode: DataMode;
  onOpen: () => void;
  favourite?: boolean;
}) {
  const { next } = currentSchedule(result, now);
  return (
    <article className="mosque-tile">
      <button
        className="mosque-tile-open"
        onClick={onOpen}
        aria-label={`Open ${result.mosque.name} timetable`}
      >
        <span className="tile-banner">
          <span>
            {favourite
              ? "Your most opened"
              : result.mosque.verificationStatus === "verified"
                ? "Verified mosque"
                : "Mosque timetable"}
          </span>
        </span>
        <span className="tile-copy">
          <strong>{result.mosque.name}</strong>
          <span>
            {result.mosque.city}
            {result.distanceMeters !== null
              ? ` · ${result.distanceMeters < 1000 ? `${Math.round(result.distanceMeters)} m` : `${(result.distanceMeters / 1000).toFixed(1)} km`} away`
              : ""}
          </span>
          <span className="tile-next">
            <span>
              {next?.label ?? "No upcoming Jamaat"}
              <small>
                {next
                  ? remainingLabel(next.timeRemainingMs)
                  : "Awaiting publication"}
              </small>
            </span>
            <b>{next ? formatClockTime(next.jamaatLocalTime) : "—"}</b>
          </span>
        </span>
      </button>
      {result.mosque.isSynthetic && (
        <p className="sample-label">Fictional mosque and times.</p>
      )}
      <FollowButton id={result.mosque.id} mode={mode} />
    </article>
  );
}
