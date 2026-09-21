"use client";
import { useActionState } from "react";
import { acceptNomination } from "@/app/admin/nomination-actions";
export function NominationForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(acceptNomination, {
    message: "",
  });
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button className="button" disabled={pending}>
        Accept moderator access
      </button>
      <p role="status">{state.message}</p>
    </form>
  );
}
