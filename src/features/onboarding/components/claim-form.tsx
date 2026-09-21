"use client";
import { useActionState } from "react";
import { submitClaim } from "@/app/claims/actions";
export function ClaimForm({ mosqueId }: { mosqueId: string }) {
  const [state, action, pending] = useActionState(submitClaim, {
    message: "",
    success: false,
  });
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="mosqueId" value={mosqueId} />
      <fieldset disabled={pending || state.success}>
        <legend>Your relationship to the mosque</legend>
        <label>
          Your name
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
          />
        </label>
        <label>
          Contact email or phone
          <input name="contact" required minLength={3} maxLength={250} />
        </label>
        <label>
          Your role at the mosque
          <input name="role" required minLength={2} maxLength={120} />
        </label>
        <label>
          Explain your authority to manage the schedule
          <textarea
            name="explanation"
            required
            minLength={10}
            maxLength={2000}
            rows={5}
          />
        </label>
        <label>
          Supporting details (optional)
          <textarea name="supporting" maxLength={2000} rows={3} />
        </label>
      </fieldset>
      <button className="button" disabled={pending || state.success}>
        {pending ? "Submitting…" : "Submit claim for review"}
      </button>
      <p role="status">{state.message}</p>
    </form>
  );
}
