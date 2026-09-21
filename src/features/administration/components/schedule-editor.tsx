"use client";
import { useActionState, useRef, useState } from "react";
import { saveSchedule } from "@/app/admin/[mosqueId]/actions";
import { PRAYER_LABELS } from "@/domain/schedule";
import { PRAYERS, type JamaatSchedule, type Prayer } from "@/domain/types";
import { scheduleDraftSchema } from "@/domain/validation";
import { SchedulePreview } from "./schedule-preview";
export function ScheduleEditor({
  mosqueId,
  initial,
  localDate,
  limited = false,
}: {
  mosqueId: string;
  initial: JamaatSchedule | null;
  localDate: string;
  limited?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [reviewing, setReviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [values, setDraftValues] = useState({
    mosqueId,
    effectiveFrom: initial
      ? limited || initial.effectiveFrom < localDate
        ? initial.effectiveFrom
        : localDate
      : localDate,
    effectiveTo: limited ? (initial?.effectiveTo ?? null) : null,
    entries: PRAYERS.map((prayer) => ({
      prayer,
      localTime:
        initial?.entries.find((e) => e.prayer === prayer)?.localTime ?? "",
    })),
    jumuahSessions: initial?.jumuahSessions ?? [],
    overrides: initial?.overrides ?? [],
  });
  function setValues(next: typeof values) {
    setDraftValues(next);
    setReviewing(false);
  }
  const [state, action, pending] = useActionState(saveSchedule, {
    message: "",
    draftId: initial?.status === "draft" ? initial.id : null,
    revision: initial?.status === "draft" ? initial.revision : null,
    published: false,
  });
  return (
    <form
      ref={form}
      action={action}
      className="form-stack"
      onSubmit={() => setReviewing(false)}
      onChange={() => {
        setReviewing(false);
        setPreviewError("");
      }}
    >
      <input type="hidden" name="mosqueId" value={mosqueId} />
      <input type="hidden" name="payload" value={JSON.stringify(values)} />
      <input type="hidden" name="draftId" value={state.draftId ?? ""} />
      <input type="hidden" name="revision" value={state.revision ?? ""} />
      {limited && (
        <p className="notice">
          Moderator access: edit daily prayer times in an existing timetable and
          save a draft. The owner reviews and publishes it. Friday sessions,
          overrides and period dates are read-only.
        </p>
      )}
      <p className="muted">
        {limited && values.effectiveTo !== null
          ? "This older timetable has an end date. The owner can publish it without an expiry."
          : "Published times stay active until changed. Publishing updates the last-published date and replaces any overlapping planned timetable."}
      </p>
      <fieldset disabled={pending}>
        <legend>Daily Jamaat · local mosque clock time</legend>
        <div className="form-grid">
          {values.entries.map((entry, index) => (
            <label key={entry.prayer}>
              {PRAYER_LABELS[entry.prayer]}
              <input
                type="time"
                required
                value={entry.localTime}
                onChange={(e) =>
                  setValues({
                    ...values,
                    entries: values.entries.map((item, i) =>
                      i === index
                        ? { ...item, localTime: e.target.value }
                        : item,
                    ),
                  })
                }
              />
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={pending || limited}>
        <legend>Friday Jumu’ah sessions</legend>
        {values.jumuahSessions.map((session, index) => (
          <div className="form-row" key={index}>
            <label>
              Session {index + 1}
              <input
                type="time"
                required
                value={session.localTime}
                onChange={(e) =>
                  setValues({
                    ...values,
                    jumuahSessions: values.jumuahSessions.map((s, i) =>
                      i === index ? { ...s, localTime: e.target.value } : s,
                    ),
                  })
                }
              />
            </label>
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setValues({
                  ...values,
                  jumuahSessions: values.jumuahSessions
                    .filter((_, i) => i !== index)
                    .map((s, i) => ({ ...s, position: i + 1 })),
                })
              }
            >
              Remove session {index + 1}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button secondary"
          disabled={values.jumuahSessions.length >= 10}
          onClick={() =>
            setValues({
              ...values,
              jumuahSessions: [
                ...values.jumuahSessions,
                {
                  position: values.jumuahSessions.length + 1,
                  localTime: "",
                  label: null,
                },
              ],
            })
          }
        >
          Add Jumu’ah session
        </button>
      </fieldset>
      <fieldset disabled={pending || limited}>
        <legend>Date overrides</legend>
        {values.overrides.map((override, index) => (
          <div className="override-row" key={index}>
            <label>
              Date
              <input
                type="date"
                required
                min={values.effectiveFrom}
                max={values.effectiveTo ?? undefined}
                value={override.localDate}
                onChange={(e) =>
                  setValues({
                    ...values,
                    overrides: values.overrides.map((o, i) =>
                      i === index ? { ...o, localDate: e.target.value } : o,
                    ),
                  })
                }
              />
            </label>
            <label>
              Prayer
              <select
                value={override.prayer}
                onChange={(e) =>
                  setValues({
                    ...values,
                    overrides: values.overrides.map((o, i) =>
                      i === index
                        ? { ...o, prayer: e.target.value as Prayer }
                        : o,
                    ),
                  })
                }
              >
                {PRAYERS.map((p) => (
                  <option key={p} value={p}>
                    {PRAYER_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Jamaat
              <input
                type="time"
                required
                value={override.localTime}
                onChange={(e) =>
                  setValues({
                    ...values,
                    overrides: values.overrides.map((o, i) =>
                      i === index ? { ...o, localTime: e.target.value } : o,
                    ),
                  })
                }
              />
            </label>
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setValues({
                  ...values,
                  overrides: values.overrides.filter((_, i) => i !== index),
                })
              }
            >
              Remove override {index + 1}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button secondary"
          disabled={values.overrides.length >= 500}
          onClick={() =>
            setValues({
              ...values,
              overrides: [
                ...values.overrides,
                {
                  localDate: values.effectiveFrom,
                  prayer: "isha",
                  localTime: "",
                },
              ],
            })
          }
        >
          Add date override
        </button>
      </fieldset>
      {reviewing && (
        <SchedulePreview
          entries={values.entries}
          jumuahSessions={values.jumuahSessions}
          overrides={values.overrides}
        />
      )}
      {previewError && <p role="alert">{previewError}</p>}
      <div className="actions">
        <button
          className="button secondary"
          name="intent"
          value="save"
          disabled={pending}
        >
          Save Draft
        </button>
        {reviewing ? (
          <>
            <button
              className="button"
              name="intent"
              value="publish"
              disabled={pending || limited}
            >
              {pending ? "Publishing…" : "Confirm publication"}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={() => setReviewing(false)}
            >
              Keep editing
            </button>
          </>
        ) : (
          <button
            type="button"
            className="button"
            disabled={pending || limited}
            onClick={() => {
              if (!form.current?.reportValidity()) return;
              if (!scheduleDraftSchema.safeParse(values).success) {
                setPreviewError(
                  "Check the times, Friday sessions and date overrides before publishing.",
                );
                return;
              }
              setReviewing(true);
            }}
          >
            Preview &amp; publish
          </button>
        )}
      </div>
      <p role="status" className="notice">
        {state.message ||
          "Saving a draft does not change public times. Preview your changes, then confirm publication to make them public."}
      </p>
    </form>
  );
}
