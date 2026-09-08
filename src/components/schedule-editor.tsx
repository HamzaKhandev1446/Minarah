"use client";
import { useActionState, useState } from "react";
import { saveSchedule } from "@/app/admin/[mosqueId]/actions";
import { PRAYER_LABELS } from "@/domain/schedule";
import { PRAYERS, type JamaatSchedule, type Prayer } from "@/domain/types";
export function ScheduleEditor({
  mosqueId,
  initial,
  localDate,
}: {
  mosqueId: string;
  initial: JamaatSchedule | null;
  localDate: string;
}) {
  const [values, setValues] = useState({
    mosqueId,
    effectiveFrom: initial?.effectiveFrom ?? localDate,
    effectiveTo: initial?.effectiveTo ?? localDate,
    entries: PRAYERS.map((prayer) => ({
      prayer,
      localTime:
        initial?.entries.find((e) => e.prayer === prayer)?.localTime ?? "",
    })),
    jumuahSessions: initial?.jumuahSessions ?? [],
    overrides: initial?.overrides ?? [],
  });
  const [state, action, pending] = useActionState(saveSchedule, {
    message: "",
    draftId: initial?.status === "draft" ? initial.id : null,
    revision: initial?.status === "draft" ? initial.revision : null,
    published: false,
  });
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="mosqueId" value={mosqueId} />
      <input type="hidden" name="payload" value={JSON.stringify(values)} />
      <input type="hidden" name="draftId" value={state.draftId ?? ""} />
      <input type="hidden" name="revision" value={state.revision ?? ""} />
      <fieldset disabled={pending}>
        <legend>Effective period</legend>
        <div className="form-grid">
          <label>
            From
            <input
              type="date"
              required
              value={values.effectiveFrom}
              onChange={(e) =>
                setValues({ ...values, effectiveFrom: e.target.value })
              }
            />
          </label>
          <label>
            Through
            <input
              type="date"
              required
              min={values.effectiveFrom}
              value={values.effectiveTo}
              onChange={(e) =>
                setValues({ ...values, effectiveTo: e.target.value })
              }
            />
          </label>
        </div>
        <p className="muted">
          Replace an existing period using the same dates, or create a
          non-overlapping new period.
        </p>
      </fieldset>
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
      <fieldset disabled={pending}>
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
      <fieldset disabled={pending}>
        <legend>Date overrides</legend>
        {values.overrides.map((override, index) => (
          <div className="override-row" key={index}>
            <label>
              Date
              <input
                type="date"
                required
                min={values.effectiveFrom}
                max={values.effectiveTo}
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
      <div className="actions">
        <button
          className="button secondary"
          name="intent"
          value="save"
          disabled={pending}
        >
          Save Draft
        </button>
        <button
          className="button"
          name="intent"
          value="publish"
          disabled={pending}
        >
          {pending ? "Saving…" : "Publish Changes"}
        </button>
      </div>
      <p role="status" className="notice">
        {state.message ||
          "Saving a draft does not change public times. Publish Changes intentionally makes this schedule public."}
      </p>
    </form>
  );
}
