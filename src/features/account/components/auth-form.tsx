"use client";
import { useActionState, useState } from "react";
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
  const [intent, setIntent] = useState<"register" | "login">("register");
  return (
    <form action={action} className="form-stack">
      {next && <input type="hidden" name="next" value={next} />}
      {next && (
        <div className="account-tabs">
          <button
            type="button"
            aria-pressed={intent === "register"}
            onClick={() => setIntent("register")}
          >
            Create an account
          </button>
          <button
            type="button"
            aria-pressed={intent === "login"}
            onClick={() => setIntent("login")}
          >
            I already have an account
          </button>
        </div>
      )}
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          placeholder="you@example.com"
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete={
            next && intent === "register" ? "new-password" : "current-password"
          }
          minLength={8}
          maxLength={128}
          required
          placeholder="At least 8 characters"
        />
      </label>
      {next ? (
        <div className="account-actions">
          <button
            className="button"
            name="intent"
            value={intent}
            disabled={pending || !configured}
          >
            {pending
              ? "Please wait…"
              : intent === "register"
                ? "Create account"
                : "Sign in & continue"}
            <span aria-hidden="true">→</span>
          </button>
          <details>
            <summary>Need a new confirmation email?</summary>
            <button
              className="text-action"
              name="intent"
              value="resend"
              formNoValidate
              disabled={pending || !configured}
            >
              Resend confirmation email
            </button>
          </details>
        </div>
      ) : (
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
      )}
      <p role="status">{state.message}</p>
    </form>
  );
}
