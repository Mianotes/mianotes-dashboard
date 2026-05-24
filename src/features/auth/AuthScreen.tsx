import { useState } from "react";
import type { FormEvent } from "react";
import { apiFetch } from "../../api/client";
import type { EmailCheckResponse, SessionResponse } from "../../api/types";
import logoUrl from "../../assets/logo_small.png";

function downloadAdminKey(adminKey: string) {
  const blobUrl = URL.createObjectURL(new Blob([`${adminKey}\n`], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = "mianotes-admin-key.txt";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

export function AuthScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [step, setStep] = useState<"email" | "join" | "login">("email");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [adminKeyRequired, setAdminKeyRequired] = useState(false);
  const [masterPasswordOwnerName, setMasterPasswordOwnerName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [sharedInstance, setSharedInstance] = useState(false);
  const [adminKey, setAdminKey] = useState("");
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
      setAdminKeyRequired(Boolean(result.admin_key_required));
      setMasterPasswordOwnerName(result.master_password_owner_name ?? null);
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
        await apiFetch<SessionResponse>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            user_id: userId,
            password,
            admin_key: adminKeyRequired ? adminKey.trim() : undefined
          })
        });
      } else {
        const session = await apiFetch<SessionResponse>("/api/auth/join", {
          method: "POST",
          body: JSON.stringify({
            email,
            name,
            password,
            password_confirmation: isFirstUser ? passwordConfirmation : undefined,
            shared_instance: isFirstUser ? sharedInstance : false
          })
        });
        if (session.admin_key) {
          downloadAdminKey(session.admin_key);
        }
      }
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    }
  }

  const masterPasswordCopy = masterPasswordOwnerName
    ? `Enter the master password set by ${masterPasswordOwnerName}.`
    : "Enter the master password set by the instance admin.";
  const authCopy = step === "email"
    ? "Enter your email address."
    : isFirstUser
      ? "This is a new Mianotes instance. Choose the master password, then decide whether admin access needs an extra recovery key."
      : masterPasswordCopy;
  const canSubmitAuth = step !== "login" || !adminKeyRequired || adminKey.trim().length > 0;

  async function readAdminKeyFile(file: File | null) {
    if (!file) return;
    setAdminKey((await file.text()).trim());
  }

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
            {step === "join" && (
              <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            )}
            <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
            {step === "join" && isFirstUser && (
              <>
                <input
                  type="password"
                  required
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  placeholder="Confirm password"
                />
                <fieldset className="auth-choice-group">
                  <legend>Will other people use this Mianotes instance?</legend>
                  <label>
                    <input
                      type="radio"
                      checked={!sharedInstance}
                      onChange={() => setSharedInstance(false)}
                    />
                    No, just me
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={sharedInstance}
                      onChange={() => setSharedInstance(true)}
                    />
                    Yes, I’ll share it
                  </label>
                </fieldset>
                {sharedInstance && (
                  <p className="auth-help">
                    This admin key is the recovery key for admin access. Save it in a password
                    manager or secure folder. Anyone with this file can unlock admin access.
                  </p>
                )}
              </>
            )}
            {step === "login" && adminKeyRequired && (
              <label className="auth-file-field">
                <span>Admin key</span>
                <input
                  required
                  type="file"
                  accept=".txt,text/plain"
                  onChange={(event) => void readAdminKeyFile(event.target.files?.[0] ?? null)}
                />
              </label>
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
