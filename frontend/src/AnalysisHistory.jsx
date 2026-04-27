import { useCallback, useEffect, useMemo, useState } from "react";
import { deleteAnalysis, getAnalyses, getAnalysis } from "./api.js";
import Results from "./Results.jsx";
import "./AnalysisHistory.css";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function formatConfidence(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export default function AnalysisHistory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [activeResult, setActiveResult] = useState(null);
  const [viewLoadingId, setViewLoadingId] = useState(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    return getAnalyses()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((e) => setError(e?.message || "Failed to load analysis history."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const at = new Date(a?.created_at ?? 0).getTime();
      const bt = new Date(b?.created_at ?? 0).getTime();
      return bt - at;
    });
  }, [items]);

  async function onView(id) {
    setError(null);
    setViewLoadingId(id);
    try {
      const detail = await getAnalysis(id);
      setActiveId(id);
      setActiveResult(detail?.result_json ?? null);
    } catch (e) {
      setError(e?.message || "Could not load this analysis.");
    } finally {
      setViewLoadingId(null);
    }
  }

  async function onDelete(id) {
    const confirmed = window.confirm("Delete this saved analysis?");
    if (!confirmed) return;
    setError(null);
    setDeleteLoadingId(id);
    try {
      await deleteAnalysis(id);
      setItems((prev) => prev.filter((item) => item?.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setActiveResult(null);
      }
    } catch (e) {
      setError(e?.message || "Could not delete this analysis.");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  return (
    <section className="analysis-history" aria-labelledby="analysis-history-heading">
      <header className="analysis-history-header">
        <h2 id="analysis-history-heading">Previous analyses</h2>
        <p>Open or delete saved policy analyses for this demo user.</p>
      </header>

      {loading && <p className="analysis-history-status">Loading history…</p>}
      {error && (
        <p className="analysis-history-status analysis-history-status--error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && sortedItems.length === 0 && (
        <p className="analysis-history-empty">No saved analyses yet.</p>
      )}

      {sortedItems.length > 0 && (
        <ul className="analysis-history-list">
          {sortedItems.map((item) => {
            const isActive = activeId === item.id;
            return (
              <li
                key={item.id}
                className={"analysis-history-item" + (isActive ? " analysis-history-item--active" : "")}
              >
                <div className="analysis-history-top">
                  <h3>{item.policy_title || "Policy analysis"}</h3>
                  <span className="analysis-history-impact">{item.overall_impact || "—"}</span>
                </div>
                <div className="analysis-history-meta">
                  <span>Profile #{item.profile_id ?? "—"}</span>
                  <span>Confidence {formatConfidence(item.confidence)}</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
                {item.policy_preview && (
                  <p className="analysis-history-preview">{item.policy_preview}</p>
                )}
                <div className="analysis-history-actions">
                  <button
                    type="button"
                    onClick={() => onView(item.id)}
                    disabled={viewLoadingId === item.id || deleteLoadingId === item.id}
                  >
                    {viewLoadingId === item.id ? "Loading…" : "View"}
                  </button>
                  <button
                    type="button"
                    className="analysis-history-delete"
                    onClick={() => onDelete(item.id)}
                    disabled={deleteLoadingId === item.id || viewLoadingId === item.id}
                  >
                    {deleteLoadingId === item.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {activeResult && (
        <div className="analysis-history-result">
          <Results result={activeResult} />
        </div>
      )}
    </section>
  );
}
