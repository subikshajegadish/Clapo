import { useEffect, useState } from "react";
import { getCurrentUser, getGoogleLoginUrl, logout } from "./api.js";
import "./AuthStatus.css";

export default function AuthStatus() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [authState, setAuthState] = useState({ authenticated: false, user: null });

  function refreshAuthStatus() {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCurrentUser()
      .then((data) => {
        if (!cancelled) setAuthState(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Could not load auth status.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    const cleanup = refreshAuthStatus();
    return cleanup;
  }, []);

  if (loading) {
    return <div className="auth-status auth-status--loading">Checking auth…</div>;
  }

  if (error) {
    return <div className="auth-status auth-status--error">{error}</div>;
  }

  if (authState.authenticated) {
    const email = authState.user?.email || "";
    const username = authState.user?.username || "";
    return (
      <div className="auth-status auth-status--authenticated" title={email || username}>
        <span>Signed in {email ? `as ${email}` : username ? `as ${username}` : ""}</span>
        <button
          type="button"
          className="auth-status-btn"
          disabled={busy}
          onClick={async () => {
            setError(null);
            setBusy(true);
            try {
              await logout();
              refreshAuthStatus();
            } catch (e) {
              setError(e?.message || "Could not log out.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Logging out…" : "Logout"}
        </button>
      </div>
    );
  }

  return (
    <div className="auth-status auth-status--demo">
      <span>Demo mode</span>
      <button
        type="button"
        className="auth-status-btn"
        onClick={() => {
          const url = getGoogleLoginUrl();
          if (!url) {
            setError("Google login is not configured yet.");
            return;
          }
          window.location.assign(url);
        }}
      >
        Continue with Google
      </button>
    </div>
  );
}
