import "./Results.css";

/**
 * @param {{ result: { policy_title?: string; summary?: string; overall_impact?: string; confidence?: number; cached?: boolean; missing_information?: string[]; assumptions?: string[]; sections?: Array<{ title?: string; emoji?: string; impact_level?: string; impact?: string; explanation?: string; action?: string; evidence?: Array<{ quote?: string; relevance?: string; verified?: boolean }> }> } | null | undefined }} props
 */
export default function Results({ result }) {
  if (!result || typeof result !== "object") {
    return null;
  }

  const {
    policy_title,
    summary,
    overall_impact,
    confidence,
    cached,
    missing_information,
    assumptions,
    sections,
  } = result;
  const list = Array.isArray(sections) ? sections : [];
  const confidencePct =
    typeof confidence === "number" && Number.isFinite(confidence)
      ? `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}%`
      : null;
  const missingInfoList = Array.isArray(missing_information)
    ? missing_information.filter((v) => typeof v === "string" && v.trim())
    : [];
  const assumptionsList = Array.isArray(assumptions)
    ? assumptions.filter((v) => typeof v === "string" && v.trim())
    : [];

  return (
    <article className="results" aria-labelledby="results-policy-title">
      <header className="results-header">
        {cached === true && (
          <span className="results-cached-badge" role="status">
            Loaded from previous analysis
          </span>
        )}
        <h2 id="results-policy-title" className="results-title">
          {policy_title ?? "Policy analysis"}
        </h2>
        <p className="results-summary">{summary ?? ""}</p>
        <div className="results-meta-row">
          <div className="results-impact" data-level={String(overall_impact ?? "").toLowerCase()}>
            <span className="results-impact-label">Overall impact</span>
            <span className="results-impact-value">{overall_impact ?? "—"}</span>
          </div>
          {confidencePct && (
            <div className="results-confidence">
              <span className="results-confidence-label">Confidence</span>
              <span className="results-confidence-value">{confidencePct}</span>
            </div>
          )}
        </div>
      </header>

      {missingInfoList.length > 0 && (
        <section className="results-note-card results-note-card--warn" aria-label="Missing information">
          <h3 className="results-note-title">Missing information</h3>
          <ul className="results-note-list">
            {missingInfoList.map((item, i) => (
              <li key={`${item}-${i}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {assumptionsList.length > 0 && (
        <section className="results-note-card results-note-card--info" aria-label="Assumptions">
          <h3 className="results-note-title">Assumptions</h3>
          <ul className="results-note-list">
            {assumptionsList.map((item, i) => (
              <li key={`${item}-${i}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {list.length > 0 && (
        <ul className="results-sections">
          {list.map((section, i) => {
            const level = section.impact ?? section.impact_level ?? "—";
            const evidence = Array.isArray(section.evidence) ? section.evidence : [];
            return (
              <li key={i} className="results-card">
                <div className="results-card-head">
                  <span className="results-card-emoji" aria-hidden="true">
                    {section.emoji ?? ""}
                  </span>
                  <h3 className="results-card-title">{section.title ?? "Section"}</h3>
                  <span
                    className="results-card-level"
                    data-level={String(level ?? "").toLowerCase()}
                  >
                    {level ?? "—"}
                  </span>
                </div>
                <p className="results-card-explanation">{section.explanation ?? ""}</p>
                <div className="results-card-action">
                  <span className="results-card-action-label">What you can do</span>
                  <p>{section.action ?? ""}</p>
                </div>

                {evidence.length > 0 && (
                  <div className="results-evidence">
                    <h4 className="results-evidence-title">Policy evidence</h4>
                    <ul className="results-evidence-list">
                      {evidence.map((item, idx) => {
                        const quote =
                          item && typeof item.quote === "string" ? item.quote : "";
                        const relevance =
                          item && typeof item.relevance === "string" ? item.relevance : "";
                        const verified =
                          item && typeof item.verified === "boolean" ? item.verified : null;
                        return (
                          <li key={idx} className="results-evidence-item">
                            <blockquote className="results-evidence-quote">
                              "{quote}"
                            </blockquote>
                            {relevance && (
                              <p className="results-evidence-relevance">{relevance}</p>
                            )}
                            <span
                              className={
                                "results-evidence-status" +
                                (verified === true
                                  ? " is-verified"
                                  : verified === false
                                    ? " is-unverified"
                                    : "")
                              }
                            >
                              {verified === true
                                ? "Verified"
                                : verified === false
                                  ? "Unverified"
                                  : "Not checked"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
