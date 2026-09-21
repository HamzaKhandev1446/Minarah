"use client";
import Link from "next/link";
import {
  currentSchedule,
  formatPublishedAt,
  remainingLabel,
  type MosqueResult,
  type DataMode,
} from "@/domain/discovery";
import { formatClockTime } from "@/domain/schedule";
import { useFollows } from "@/components/public-context";
import { UiIcon } from "@/components/ui-icon";
import { FOLLOW_EVENT, toggleFollow } from "@/lib/follows/storage";
import { useState } from "react";
export function JamaatPreview({
  result,
  now,
  mode,
  selected = false,
}: {
  result: MosqueResult;
  now: string;
  mode: DataMode;
  selected?: boolean;
}) {
  const { today, next } = currentSchedule(result, now);
  const { ids } = useFollows(mode);
  const [error, setError] = useState("");
  const saved = ids.includes(result.mosque.id);
  const href = `/mosques/${result.mosque.slug}${mode === "demo" ? "?mode=demo" : ""}`;
  return (
    <article
      className={`jamaat-preview ${selected ? "selected-preview" : ""}`}
      aria-label={result.mosque.name}
    >
      <div className="preview-heading">
        <div>
          <h2>
            <Link href={href}>{result.mosque.name}</Link>
          </h2>
          <p>
            <UiIcon name="check" size={17} />
            {result.mosque.isSynthetic
              ? "Fictional demo"
              : result.mosque.verificationStatus === "verified"
                ? "Verified"
                : "Not verified"}
            {result.distanceMeters !== null &&
              ` · ${(result.distanceMeters / 1000).toFixed(1)} km`}
          </p>
        </div>
        <button
          className="favourite-heart"
          aria-label={`${saved ? "Remove" : "Add"} ${result.mosque.name} ${saved ? "from" : "to"} favourites`}
          aria-pressed={saved}
          onClick={() => {
            try {
              toggleFollow(localStorage, mode, result.mosque.id);
              window.dispatchEvent(new Event(FOLLOW_EVENT));
              setError("");
            } catch {
              setError(
                "Your browser could not save this change. Please check storage settings.",
              );
            }
          }}
        >
          <UiIcon name="heart" />
        </button>
      </div>
      <div className="preview-next">
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
            {next ? remainingLabel(next.timeRemainingMs) : "No published time"}
          </small>
        </div>
      </div>
      {selected && (
        <Link className="view-mosque" href={href}>
          View mosque <UiIcon name="arrow" />
        </Link>
      )}
      <p className="schedule-freshness">
        {formatPublishedAt(today.publishedAt, result.mosque.timezone)}
      </p>
      {error && <p role="alert">{error}</p>}
    </article>
  );
}
