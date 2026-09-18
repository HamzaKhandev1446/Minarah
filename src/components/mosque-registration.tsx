"use client";
import { useEffect, useState } from "react";
import { LocationPicker } from "./location-picker";
import { AuthForm } from "./auth-form";
import { SubmissionForm } from "./submission-form";
import { placeSchema, type SelectedPlace } from "@/lib/place-search";
import { UiIcon } from "./ui-icon";
const storageKey = "minarah:registration-location:v1";
export function MosqueRegistration({
  email,
  configured,
  ready,
  initialPlace,
}: {
  email: string | null;
  configured: boolean;
  ready: boolean;
  initialPlace?: SelectedPlace;
}) {
  const [place, setPlace] = useState<SelectedPlace | null>(
    initialPlace || null,
  );
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (initialPlace) return;
    const timer = setTimeout(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
        const parsed = placeSchema.safeParse(saved?.place);
        if (parsed.success) {
          setPlace(parsed.data);
          setConfirmed(saved.confirmed === true);
        }
      } catch {
        /* Optional same-tab recovery. */
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [initialPlace]);
  function save(next: SelectedPlace, confirm = false) {
    setPlace(next);
    setConfirmed(confirm);
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ place: next, confirmed: confirm }),
      );
    } catch {
      /* Location can still be submitted without storage. */
    }
  }
  return (
    <div className="registration-flow">
      <ol className="registration-steps">
        <li
          className={confirmed ? "complete" : ""}
          aria-current={!confirmed ? "step" : undefined}
        >
          <span>{confirmed ? <UiIcon name="check" size={14} /> : "1"}</span>
          Location
        </li>
        <li aria-current={confirmed && !email ? "step" : undefined}>
          <span>{email ? <UiIcon name="check" size={14} /> : "2"}</span>Account
        </li>
        <li aria-current={confirmed && email ? "step" : undefined}>
          <span>3</span>Mosque details
        </li>
      </ol>
      {!confirmed ? (
        <>
          <div className="step-heading">
            <p className="eyebrow">Step 1 of 3</p>
            <h2>Where is your mosque?</h2>
            <p>Find it on the map. We’ll take care of the coordinates.</p>
          </div>
          <LocationPicker value={place} onChange={(p) => save(p)} />
          <div className="step-footer">
            <div>
              <strong>
                {place ? "Location selected" : "Choose a location to continue"}
              </strong>
              <span>
                {place?.name ||
                  (place
                    ? "Make sure the pin is at your mosque."
                    : "Search, use your location, or tap the map.")}
              </span>
            </div>
            <button
              className="button"
              disabled={!place}
              onClick={() => place && save(place, true)}
            >
              <span>Confirm mosque location</span>
              <UiIcon name="arrow" size={18} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="confirmed-location">
            <span className="confirmed-icon">
              <UiIcon name="check" size={20} />
            </span>
            <div>
              <strong>{place?.name || "Mosque location confirmed"}</strong>
              <p>
                {place?.city ||
                  `${place?.latitude.toFixed(6)}, ${place?.longitude.toFixed(6)}`}
              </p>
            </div>
            <button
              className="text-action"
              onClick={() => place && save(place, false)}
            >
              Change location
            </button>
          </div>
          {!email ? (
            <>
              <div className="step-heading">
                <p className="eyebrow">Step 2 of 3</p>
                <h2>Create your representative account</h2>
                <p>A personal account to manage your mosque’s timetable.</p>
              </div>
              <div className="account-step">
                <AuthForm configured={configured} next="/register-mosque" />
                <p className="account-help">
                  Confirm your email, then sign in to continue. Your selected
                  location stays in this tab.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="step-heading">
                <p className="eyebrow">Step 3 of 3</p>
                <h2>Introduce your mosque</h2>
                <p>
                  Signed in as {email}. Complete the details below for review.
                </p>
              </div>
              {!ready && (
                <p role="status" className="notice">
                  Mosque registration is not connected yet. You can explore the
                  form, but submission is unavailable until setup is complete.
                </p>
              )}
              <SubmissionForm
                configured={ready}
                registration
                location={place || undefined}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
