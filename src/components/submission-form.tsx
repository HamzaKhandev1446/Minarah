"use client";
import { useActionState } from "react";
import { submitMosque } from "@/app/submit/actions";
export function SubmissionForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(submitMosque, {
    message: "",
    success: false,
  });
  return (
    <form action={action} className="form-stack">
      <fieldset disabled={pending || state.success}>
        <legend>Mosque details</legend>
        <label>
          Mosque name
          <input name="name" required minLength={2} maxLength={160} />
        </label>
        <label>
          Street address
          <input name="addressLine" required minLength={2} maxLength={300} />
        </label>
        <div className="form-grid">
          <label>
            City
            <input name="city" required maxLength={120} />
          </label>
          <label>
            Country code (two letters)
            <input
              name="countryCode"
              required
              pattern="[A-Z]{2}"
              maxLength={2}
              placeholder="PK"
            />
          </label>
          <label>
            Latitude
            <input
              name="latitude"
              type="number"
              required
              min={-90}
              max={90}
              step="any"
            />
          </label>
          <label>
            Longitude
            <input
              name="longitude"
              type="number"
              required
              min={-180}
              max={180}
              step="any"
            />
          </label>
        </div>
        <p className="muted">
          Enter the mosque’s coordinates, not your personal location.
        </p>
        <label>
          IANA timezone
          <input name="timezone" required placeholder="Asia/Karachi" />
        </label>
        <label>
          Phone (optional)
          <input name="phone" type="tel" maxLength={40} />
        </label>
        <label>
          Website (optional)
          <input
            name="website"
            type="url"
            maxLength={500}
            placeholder="https://"
          />
        </label>
        <label>
          Notes (optional)
          <textarea name="notes" maxLength={2000} rows={4} />
        </label>
        <div className="honeypot" aria-hidden="true">
          <label>
            Company
            <input name="company" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
      </fieldset>
      <button
        className="button"
        disabled={pending || state.success || !configured}
      >
        {pending ? "Submitting…" : "Submit mosque for review"}
      </button>
      <p role="status">{state.message}</p>
    </form>
  );
}
