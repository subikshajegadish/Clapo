import "./Results.css";

/**
 * @param {{ result: { policy_title?: string; summary?: string; overall_impact?: string; sections?: Array<{ title?: string; emoji?: string; impact_level?: string; explanation?: string; action?: string }> } | null | undefined }} props
 */
export default function Results({ result }) {
  if (!result || typeof result !== "object") {
    return null;
  }

  const { policy_title, summary, overall_impact, sections } = result;
  const list = Array.isArray(sections) ? sections : [];

  return (
    <article className="results" aria-labelledby="results-policy-title">
      <header className="results-header">
        <h2 id="results-policy-title" className="results-title">
          {policy_title ?? "Policy analysis"}
        </h2>
        <p className="results-summary">{summary ?? ""}</p>
        <div className="results-impact" data-level={String(overall_impact ?? "").toLowerCase()}>
          <span className="results-impact-label">Overall impact</span>
          <span className="results-impact-value">{overall_impact ?? "—"}</span>
        </div>
      </header>

      {list.length > 0 && (
        <ul className="results-sections">
          {list.map((section, i) => (
            <li key={i} className="results-card">
              <div className="results-card-head">
                <span className="results-card-emoji" aria-hidden="true">
                  {section.emoji ?? ""}
                </span>
                <h3 className="results-card-title">{section.title ?? "Section"}</h3>
                <span
                  className="results-card-level"
                  data-level={String(section.impact_level ?? "").toLowerCase()}
                >
                  {section.impact_level ?? "—"}
                </span>
              </div>
              <p className="results-card-explanation">{section.explanation ?? ""}</p>
              <div className="results-card-action">
                <span className="results-card-action-label">What you can do</span>
                <p>{section.action ?? ""}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
