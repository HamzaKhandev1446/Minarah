"use client";
import { useActionState } from "react";
import { submitMosque } from "@/app/submit/actions";
import type { SelectedPlace } from "@/lib/place-search";
import { SECTS } from "@/domain/onboarding";
export function SubmissionForm({
  configured,
  registration = false,
  location,
}: {
  configured: boolean;
  registration?: boolean;
  location?: SelectedPlace;
}) {
  const [state, action, pending] = useActionState(submitMosque, {
    message: "",
    success: false,
  });
  return (
    <form action={action} className="form-stack">
      <input
        type="hidden"
        name="registration"
        value={registration ? "1" : "0"}
      />
      {registration && (
        <fieldset disabled={pending || state.success}>
          <legend>Your details</legend>
          <label>
            Your name
            <input
              name="representativeName"
              required
              minLength={2}
              maxLength={120}
            />
          </label>
          <label>
            Your role at the mosque
            <input
              name="representativeRole"
              required
              minLength={2}
              maxLength={120}
            />
          </label>
          <label>
            Contact phone
            <input
              name="representativeContact"
              required
              minLength={3}
              maxLength={250}
            />
          </label>
          <label>
            Explain your authority
            <textarea
              name="authority"
              required
              minLength={10}
              maxLength={2000}
            />
          </label>
          <p>
            Optional: nominate up to two moderators. Each must confirm their own
            account and accept the nomination after review. They can edit daily
            prayer times in drafts; the owner publishes.
          </p>
          {[1, 2].map((index) => (
            <div key={index}>
              <label>
                Moderator {index} name
                <input name={`moderatorName${index}`} maxLength={120} />
              </label>
              <label>
                Moderator {index} email
                <input
                  name={`moderatorEmail${index}`}
                  type="email"
                  maxLength={254}
                />
              </label>
            </div>
          ))}
        </fieldset>
      )}
      <fieldset disabled={pending || state.success}>
        <legend>Mosque details</legend>
        <label>
          Mosque name
          <input
            name="name"
            required
            minLength={2}
            maxLength={160}
            defaultValue={location?.name}
          />
        </label>
        {registration && (
          <div className="form-grid">
            <label>
              Sect / school of thought
              <select name="sect" required defaultValue="">
                <option value="" disabled>
                  Select sect
                </option>
                {SECTS.map((sect) => (
                  <option key={sect}>{sect}</option>
                ))}
              </select>
            </label>
            <label>
              Sub-sect (optional)
              <input name="subSect" maxLength={120} />
            </label>
          </div>
        )}
        <label>
          Street address
          <input
            name="addressLine"
            required
            minLength={2}
            maxLength={300}
            defaultValue={location?.address}
          />
        </label>
        <div className="form-grid">
          <label>
            City
            <input
              name="city"
              required
              maxLength={120}
              defaultValue={location?.city}
            />
          </label>
          <label>
            Country code (two letters)
            <input
              name="countryCode"
              required
              pattern="[A-Z]{2}"
              maxLength={2}
              placeholder="PK"
              defaultValue={location?.countryCode}
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
              value={location?.latitude}
              readOnly={!!location}
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
              value={location?.longitude}
              readOnly={!!location}
            />
          </label>
        </div>
        <p className="muted">
          {location
            ? "Coordinates come from your confirmed mosque pin. Use Change location above to adjust it."
            : "Enter the mosque’s coordinates, not your personal location."}
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
