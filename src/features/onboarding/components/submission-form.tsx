"use client";
import { useActionState, useEffect } from "react";
import Link from "next/link";
import { UiIcon } from "@/components/ui-icon";
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
  useEffect(() => {
    if (state.success && registration) {
      try {
        sessionStorage.removeItem("minarah:registration-location:v1");
      } catch {
        /* Submission success is independent of browser storage. */
      }
    }
  }, [state.success, registration]);
  if (state.success)
    return (
      <section className="submission-success" role="status">
        <span className="confirmed-icon">
          <UiIcon name="check" size={28} />
        </span>
        <p className="eyebrow">Registration received</p>
        <h2>You’re one step closer.</h2>
        <p>{state.message}</p>
        <Link className="button" href="/admin">
          Go to my mosques <UiIcon name="arrow" size={18} />
        </Link>
      </section>
    );
  return (
    <form action={action} className="form-stack">
      <input
        type="hidden"
        name="registration"
        value={registration ? "1" : "0"}
      />

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
          {location ? (
            <>
              <input type="hidden" name="latitude" value={location.latitude} />
              <input
                type="hidden"
                name="longitude"
                value={location.longitude}
              />
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
        <p className="muted">
          {location
            ? "Coordinates come from your confirmed mosque pin. Use Change location above to adjust it."
            : "Enter the mosque’s coordinates, not your personal location."}
        </p>
        <label>
          Mosque timezone
          <input
            name="timezone"
            required
            placeholder="e.g. Asia/Karachi"
            list="mosque-timezones"
            defaultValue={
              location?.countryCode === "PK" ? "Asia/Karachi" : undefined
            }
          />
          <datalist id="mosque-timezones">
            <option value="Asia/Karachi">Pakistan</option>
            <option value="Asia/Kolkata">India</option>
            <option value="Asia/Dhaka">Bangladesh</option>
            <option value="Asia/Dubai">UAE</option>
            <option value="Asia/Riyadh">Saudi Arabia</option>
            <option value="Europe/London">United Kingdom</option>
            <option value="America/New_York">US Eastern</option>
          </datalist>
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
          <details className="optional-section">
            <summary>Add moderators (optional)</summary>
            <p>
              Nominate up to two people to update daily prayer times. Each
              confirms their own account and accepts after review. You keep
              publication rights.
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
          </details>
        </fieldset>
      )}
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
