"use client";
import { useActionState } from "react";
import { authenticate } from "@/app/auth/actions";
export function AuthForm({
  configured,
  next,
}: {
  configured: boolean;
  next?: "/register-mosque";
}) {
  const [state, action, pending] = useActionState(authenticate, {
    message: "",
  });
  return (
    <form action={action} className="form-stack">
      {next && <input type="hidden" name="next" value={next} />}
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          maxLength={128}
          required
        />
      </label>
      <div className="actions">
        <button
          className="button"
          name="intent"
          value="login"
          disabled={pending || !configured}
        >
          {pending ? "Please wait…" : "Sign in"}
        </button>
        <button
          className="button secondary"
          name="intent"
          value="register"
          disabled={pending || !configured}
        >
          Create account
        </button>
        <button
          className="button secondary"
          name="intent"
          value="resend"
          formNoValidate
          disabled={pending || !configured}
        >
          Resend confirmation email
        </button>
      </div>
      <p role="status">{state.message}</p>
    </form>
  );
}
