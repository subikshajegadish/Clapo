import { useCallback, useEffect, useState } from "react";
import { getProfiles } from "./api.js";
import CreateProfile from "./CreateProfile.jsx";
import Analyze from "./Analyze.jsx";
import AnalysisHistory from "./AnalysisHistory.jsx";
import "./ProfileList.css";

/**
 * @param {{ onCreateNew?: () => void }} props
 */
export default function ProfileList({ onCreateNew }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState("analyze");

  const refreshProfiles = useCallback(() => {
    setLoading(true);
    setError(null);
    return getProfiles()
      .then((data) => setProfiles(Array.isArray(data) ? data : []))
      .catch((e) => setError(e?.message || "Failed to load profiles"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProfiles()
      .then((data) => {
        if (!cancelled) setProfiles(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Failed to load profiles");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="profile-list-screen" aria-labelledby="profile-list-heading">
      <header className="profile-list-header">
        <h1 id="profile-list-heading">Choose a profile</h1>
        <p className="profile-list-sub">
          Select who you want policy analysis for, or create a new profile.
        </p>
        <button
          type="button"
          className="profile-list-btn profile-list-btn--primary"
          onClick={() => {
            onCreateNew?.();
            setShowCreate((v) => !v);
          }}
        >
          {showCreate ? "Hide form" : "Create New Profile"}
        </button>
      </header>

      {showCreate && (
        <CreateProfile
          onSuccess={() => {
            refreshProfiles();
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {loading && <p className="profile-list-status">Loading profiles…</p>}
      {error && (
        <p className="profile-list-status profile-list-status--error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && selectedProfile && (
        <div
          className="profile-list-selected"
          role="status"
          aria-live="polite"
        >
          <span className="profile-list-selected-label">Selected</span>
          <strong className="profile-list-selected-name">
            {selectedProfile.name ?? "—"}
          </strong>
          <span className="profile-list-selected-meta">
            {selectedProfile.employment_status ?? "—"}
            {selectedProfile.state != null && selectedProfile.state !== ""
              ? ` · ${selectedProfile.state}`
              : ""}
          </span>
          <span className="profile-list-selected-id">ID {selectedProfile.id}</span>
        </div>
      )}

      {!loading && !error && profiles.length === 0 && (
        <p className="profile-list-empty">No profiles yet. Create one to get started.</p>
      )}

      <ul className="profile-list-grid">
        {profiles.map((p) => {
          const isSelected = selectedProfile?.id === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                className={
                  "profile-card" + (isSelected ? " profile-card--selected" : "")
                }
                onClick={() => setSelectedProfile(p)}
                aria-pressed={isSelected}
              >
                <span className="profile-card-name">{p.name ?? "—"}</span>
                <span className="profile-card-status">
                  {p.employment_status ?? "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {selectedProfile && (
        <>
          <div className="profile-list-tabs" role="tablist" aria-label="Policy tools">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "analyze"}
              className={"profile-list-tab" + (activeTab === "analyze" ? " is-active" : "")}
              onClick={() => setActiveTab("analyze")}
            >
              Analyze Policy
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "history"}
              className={"profile-list-tab" + (activeTab === "history" ? " is-active" : "")}
              onClick={() => setActiveTab("history")}
            >
              History
            </button>
          </div>
          {activeTab === "analyze" ? (
            <Analyze profileId={selectedProfile.id} key={selectedProfile.id} />
          ) : (
            <AnalysisHistory />
          )}
        </>
      )}
    </section>
  );
}
