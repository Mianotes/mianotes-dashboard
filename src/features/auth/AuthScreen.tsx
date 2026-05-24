import { useState } from "react";
import type { FormEvent } from "react";
import { apiFetch } from "../../api/client";
import type { EmailCheckResponse } from "../../api/types";
import logoUrl from "../../assets/logo_small.png";

export function AuthScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [step, setStep] = useState<"email" | "join" | "login">("email");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [signupDisabled, setSignupDisabled] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [workspaceAccessMode, setWorkspaceAccessMode] = useState<"open" | "admin_only">("open");
  const [error, setError] = useState<string | null>(null);

  async function checkEmail(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await apiFetch<EmailCheckResponse>("/api/auth/check-email", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setUserId(result.user_id);
      setIsFirstUser(Boolean(result.is_first_user));
      setSignupDisabled(Boolean(result.signup_disabled));
      setStep(result.user_id ? "login" : "join");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check email");
    }
  }

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (step === "login") {
        await apiFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ user_id: userId, password })
        });
      } else {
        await apiFetch("/api/auth/join", {
          method: "POST",
          body: JSON.stringify({
            email,
            name,
            password,
            password_confirmation: passwordConfirmation,
            workspace_access_mode: isFirstUser ? workspaceAccessMode : undefined
          })
        });
      }
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    }
  }

  const authCopy = step === "email"
    ? "Enter your email address."
    : isFirstUser
      ? "Create the admin account for this workspace."
      : "Enter your password for this workspace.";
  const canSubmitAuth = step === "login" || !signupDisabled;

  return (
    <main className="screen auth-screen">
      <section className="auth-panel">
        <div className="auth-brand">
          <img className="brand-logo" src={logoUrl} alt="Mianotes" />
        </div>
        <h1>Sign in</h1>
        <p>{authCopy}</p>
        {step === "email" ? (
          <form onSubmit={checkEmail} className="form-stack">
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" />
            <button className="primary-button">Continue</button>
          </form>
        ) : (
          <form onSubmit={submitAuth} className="form-stack">
            {step === "join" && signupDisabled && (
              <div className="notice danger">
                Only the admin email can access this workspace.
              </div>
            )}
            {step === "join" && (
              <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            )}
            <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
            {step === "join" && (
              <input
                type="password"
                required
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                placeholder="Confirm password"
              />
            )}
            {step === "join" && isFirstUser && (
              <div className="auth-choice-group" role="radiogroup" aria-labelledby="workspace-access-label">
                <span id="workspace-access-label">
                  You can let other people create accounts for this workspace, or keep access limited to the admin account.
                </span>
                <label>
                  <input
                    type="radio"
                    name="workspace-access-mode"
                    checked={workspaceAccessMode === "open"}
                    onChange={() => setWorkspaceAccessMode("open")}
                  />
                  <span>
                    <strong>Allow others to join</strong>
                    <small>Other people can create accounts and join this workspace.</small>
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="workspace-access-mode"
                    checked={workspaceAccessMode === "admin_only"}
                    onChange={() => setWorkspaceAccessMode("admin_only")}
                  />
                  <span>
                    <strong>Admin only</strong>
                    <small>Only the admin email can access this workspace.</small>
                  </span>
                </label>
              </div>
            )}
            <button className="primary-button" disabled={!canSubmitAuth}>
              {step === "join" ? "Create account" : "Sign in"}
            </button>
            <button className="text-button" type="button" onClick={() => setStep("email")}>Use another email</button>
          </form>
        )}
        {error && <div className="notice danger">{error}</div>}
      </section>
    </main>
  );
}
