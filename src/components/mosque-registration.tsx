"use client";
import { useEffect, useState } from "react";
import { LocationPicker } from "./location-picker";
import { AuthForm } from "./auth-form";
import { SubmissionForm } from "./submission-form";
import { placeSchema, type SelectedPlace } from "@/lib/place-search";
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
        <li aria-current={!confirmed ? "step" : undefined}>1. Location</li>
        <li aria-current={confirmed && !email ? "step" : undefined}>
          2. Account
        </li>
        <li aria-current={confirmed && email ? "step" : undefined}>
          3. Mosque details
        </li>
      </ol>
      {!confirmed ? (
        <>
          <h2>Where is your mosque?</h2>
          <LocationPicker value={place} onChange={(p) => save(p)} />
          <button
            className="button"
            disabled={!place}
            onClick={() => place && save(place, true)}
          >
            Confirm mosque location
          </button>
        </>
      ) : (
        <>
          <p className="notice">
            Mosque location: {place?.latitude.toFixed(6)},{" "}
            {place?.longitude.toFixed(6)}{" "}
            <button
              className="button secondary"
              onClick={() => place && save(place, false)}
            >
              Change location
            </button>
          </p>
          {!email ? (
            <>
              <h2>Create your representative account</h2>
              <p>
                Use your own email and password. Confirm your email, then sign
                in here to complete the mosque details. Your selected pin is
                kept in this tab; passwords are never saved in browser storage.
              </p>
              <AuthForm configured={configured} next="/register-mosque" />
            </>
          ) : (
            <>
              <h2>Your account and mosque details</h2>
              <p>
                Signed in as {email}. Your authority will be reviewed before
                owner access is activated.
              </p>
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
