"use client";

import { useActionState, useMemo, useState } from "react";
import { signIn, signUp, type AuthActionState } from "./actions";
import { roleLabels, userRoles, type UserRole } from "@/lib/auth/roles";

const initialState: AuthActionState = {
  message: "",
  status: "idle",
};

type AuthMode = "signin" | "signup";

export function LoginForm() {
  const [role, setRole] = useState<UserRole>("student");
  const [mode, setMode] = useState<AuthMode>("signin");
  const [signInState, signInAction, isSigningIn] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, isSigningUp] = useActionState(signUp, initialState);

  const activeState = mode === "signin" ? signInState : signUpState;
  const isPending = mode === "signin" ? isSigningIn : isSigningUp;
  const action = mode === "signin" ? signInAction : signUpAction;
  const title = useMemo(
    () =>
      mode === "signin"
        ? `${roleLabels[role]} login`
        : `Create ${roleLabels[role].toLowerCase()} account`,
    [mode, role],
  );

  return (
    <div className="auth-card">
      <h2>{title}</h2>
      <p>Use your university account to enter the system workspace.</p>

      <div className="segmented" aria-label="User role">
        {userRoles.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={role === option}
            onClick={() => setRole(option)}
          >
            {roleLabels[option]}
          </button>
        ))}
      </div>

      <div className="mode-toggle" aria-label="Authentication mode">
        <button
          type="button"
          aria-pressed={mode === "signin"}
          onClick={() => setMode("signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          aria-pressed={mode === "signup"}
          onClick={() => setMode("signup")}
        >
          Create account
        </button>
      </div>

      <form className="form-grid" action={action}>
        <input type="hidden" name="role" value={role} />

        {mode === "signup" ? (
          <>
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <input id="fullName" name="fullName" autoComplete="name" required />
            </div>

            <div className="field">
              <label htmlFor="universityId">University ID</label>
              <input id="universityId" name="universityId" autoComplete="off" />
            </div>

            <div className="field">
              <label htmlFor="department">Department</label>
              <input id="department" name="department" autoComplete="organization" />
            </div>
          </>
        ) : null}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" name="email" autoComplete="email" required />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={6}
            required
          />
        </div>

        <button className="button" type="submit" disabled={isPending}>
          {isPending ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      {activeState.message ? (
        <div className={`auth-message ${activeState.status === "success" ? "success" : ""}`}>
          {activeState.message}
        </div>
      ) : null}
    </div>
  );
}
