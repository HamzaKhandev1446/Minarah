"use client";
import { useActionState } from "react";
import { reviewRecord } from "@/app/platform/actions";
export function ReviewForm({
  id,
  kind,
}: {
  id: string;
  kind: "claim" | "submission" | "registration";
}) {
  const [state, action, pending] = useActionState(reviewRecord, {
    message: "",
  });
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      {kind === "claim" && (
        <label>
          Approved membership role
          <select name="role" defaultValue="admin">
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
        </label>
      )}
      <p>
        {kind === "claim"
          ? "Approval grants management access and verifies the mosque. Confirm the claimant’s authority first."
          : kind === "registration"
            ? "Confirm the representative’s authority. Approval verifies the mosque, grants owner access and makes the two limited moderator nominations available for acceptance."
            : "Approval adds an unverified public mosque. It grants no management access."}
      </p>
      <div className="actions">
        <button
          className="button"
          name="decision"
          value="approve"
          disabled={pending}
        >
          {kind === "claim"
            ? "Approve claim & verify mosque"
            : kind === "registration"
              ? "Approve registration & owner"
              : "Approve mosque submission"}
        </button>
        <button
          className="button secondary"
          name="decision"
          value="reject"
          disabled={pending}
        >
          Reject
        </button>
      </div>
      <p role="status">{state.message}</p>
    </form>
  );
}
