function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join("; ");
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([key, val]) => `${key}: ${toText(val)}`).join("; ");
  return String(value);
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(toText).filter(Boolean);
  const item = toText(value);
  return item ? [item] : [];
}

function Block({ title, items }: { title: string; items?: unknown }) {
  const rows = toList(items);
  return <div><strong>{title}</strong><ul style={{ lineHeight: 1.7, marginTop: 8 }}>{(rows.length ? rows : ["None listed."]).map((item, index) => <li key={index}>{item}</li>)}</ul></div>;
}

export function AiResultView({ output, sources }: { output: any; sources?: any[] }) {
  if (!output) return <p style={{ color: "#5d687b" }}>No analysis result found.</p>;
  return <div style={{ display: "grid", gap: 18 }}><div><strong>Review Summary</strong><p style={{ lineHeight: 1.6 }}>{toText(output.review_summary) || "No summary provided."}</p></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}><Block title="Identity / Match Concerns" items={output.identity_match_concerns} /><Block title="Record Completeness" items={output.record_completeness} /><Block title="Disposition Concerns" items={output.disposition_concerns} /><Block title="Possible Reportability Issues" items={output.possible_reportability_issues} /><Block title="Possible Compliance Concerns" items={output.possible_fcra_concerns} /><Block title="Missing Information" items={output.missing_information} /><Block title="Sources Used" items={output.sources_used} /></div><div className="card" style={{ background: "#f8fafc", padding: 16 }}><strong>Recommended Next Step</strong><p>{toText(output.recommended_next_step) || "Not provided."}</p><p><strong>County verification needed:</strong> {output.county_verification_needed ? "Yes" : "No"}</p><p><strong>Supervisor review needed:</strong> {output.supervisor_review_needed ? "Yes" : "No"}</p><p><strong>Confidence:</strong> {typeof output.confidence === "number" ? `${Math.round(output.confidence * 100)}%` : toText(output.confidence) || "Not provided"}</p></div><div><strong>Draft Reviewer Note</strong><pre style={{ background: "#f8fafc", borderRadius: 12, padding: 16, whiteSpace: "pre-wrap" }}>{toText(output.draft_reviewer_note) || "No draft note provided."}</pre></div>{sources?.length ? <div><strong>Source Excerpts</strong>{sources.map((source: any) => <pre key={source.id || source.source_label} style={{ background: "#f8fafc", borderRadius: 12, padding: 12, whiteSpace: "pre-wrap" }}>{toText(source.source_label)}\n{toText(source.source_excerpt)}</pre>)}</div> : null}</div>;
}
