function ListBlock({ title, items }: { title: string; items?: string[] }) {
  return <div><strong>{title}</strong><ul style={{ lineHeight: 1.7, marginTop: 8 }}>{(items && items.length ? items : ["None listed."]).map((item, idx) => <li key={idx}>{item}</li>)}</ul></div>;
}

export function AiReviewPanel({ caseId, latestReview }: { caseId: string; latestReview: any }) {
  const output = latestReview?.structured_output || null;
  return (
    <section className="card" style={{ marginTop: 18, padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div><h2 style={{ margin: 0 }}>AI Review Guidance</h2><p style={{ color: "#5d687b", marginBottom: 0 }}>Guidance only. Final decision requires SaffHire human review.</p></div>
        <form action={`/api/cases/${caseId}/ai-review`} method="post"><button className="btn-primary" type="submit">Run AI Review</button></form>
      </div>
      {!output ? <p style={{ color: "#5d687b" }}>No AI review has been run yet.</p> : <div style={{ display: "grid", gap: 18, marginTop: 18 }}>
        <div><strong>Review Summary</strong><p style={{ lineHeight: 1.6 }}>{output.review_summary}</p></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
          <ListBlock title="Identity / Match Concerns" items={output.identity_match_concerns} />
          <ListBlock title="Record Completeness" items={output.record_completeness} />
          <ListBlock title="Possible Reportability Issues" items={output.possible_reportability_issues} />
          <ListBlock title="Possible FCRA / Compliance Concerns" items={output.possible_fcra_concerns} />
          <ListBlock title="Missing Information" items={output.missing_information} />
          <ListBlock title="Sources Used" items={output.sources_used} />
        </div>
        <div className="card" style={{ background: "#f8fafc", padding: 16 }}><strong>Recommended Next Step</strong><p>{output.recommended_next_step}</p><p><strong>County verification needed:</strong> {output.county_verification_needed ? "Yes" : "No"}</p><p><strong>Supervisor review needed:</strong> {output.supervisor_review_needed ? "Yes" : "No"}</p><p><strong>Confidence:</strong> {typeof output.confidence === "number" ? `${Math.round(output.confidence * 100)}%` : "Not provided"}</p></div>
        <div><strong>Draft Reviewer Note</strong><pre style={{ background: "#f8fafc", borderRadius: 12, padding: 16, whiteSpace: "pre-wrap" }}>{output.draft_reviewer_note}</pre></div>
        {latestReview.ai_review_sources?.length ? <div><strong>Stored Source Excerpts</strong>{latestReview.ai_review_sources.map((source: any) => <pre key={source.id} style={{ background: "#f8fafc", borderRadius: 12, padding: 12, whiteSpace: "pre-wrap" }}>{source.source_label}\n{source.source_excerpt}</pre>)}</div> : null}
      </div>}
    </section>
  );
}
