import Link from "next/link";
import { notFound } from "next/navigation";
import { getCaseBundle, getReviewTypeLabel, getStatusLabel } from "@/lib/cases";
import { requireUser } from "@/lib/session";

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join("; ");
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([key, val]) => `${key}: ${toText(val)}`).join("; ");
  return String(value);
}
function list(value: unknown): string[] { if (Array.isArray(value)) return value.map(toText).filter(Boolean); const text = toText(value); return text ? [text] : []; }
function Block({ title, items }: { title: string; items?: unknown }) { const rows = list(items); return <section><h3>{title}</h3><ul>{(rows.length ? rows : ["None listed."]).map((row, index) => <li key={index}>{row}</li>)}</ul></section>; }

export default async function CaseSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const { item, latestReview, decisions } = await getCaseBundle(id);
  if (!item) notFound();
  const output = latestReview?.structured_output || null;
  return <main style={{ background: "white", color: "#172033", fontFamily: "Arial, sans-serif", margin: "0 auto", maxWidth: 900, padding: 32 }}><style>{"@media print { .no-print { display: none; } body { background: white; } } h1,h2,h3{color:#0f3b5f} section{margin-top:22px} pre{white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:8px}"}</style><div className="no-print" style={{ display: "flex", gap: 12, marginBottom: 20 }}><Link href={`/cases/${item.id}`}>← Back to case</Link><button onClick={undefined as any}>Use browser print</button></div><h1>SaffHire Review Summary</h1><p><strong>AI guidance only. Final decision requires authorized human review.</strong></p><section><h2>Case Details</h2><p><strong>Subject:</strong> {item.subject_name}</p><p><strong>Review Type:</strong> {getReviewTypeLabel(item.review_type)}</p><p><strong>Status:</strong> {getStatusLabel(item.status)}</p><p><strong>DOB:</strong> {item.dob || "Not entered"}</p><p><strong>Client:</strong> {item.client_name || "Not entered"}</p><p><strong>County/State:</strong> {[item.county, item.state].filter(Boolean).join(", ") || "Not entered"}</p><p><strong>Reference:</strong> {item.external_reference_number || "Not entered"}</p></section>{output ? <section><h2>AI Review Guidance</h2><p>{toText(output.review_summary)}</p><Block title="Identity / Match Concerns" items={output.identity_match_concerns} /><Block title="Record Completeness" items={output.record_completeness} /><Block title="Possible Reportability Issues" items={output.possible_reportability_issues} /><Block title="Possible FCRA / Compliance Concerns" items={output.possible_fcra_concerns} /><Block title="Missing Information" items={output.missing_information} /><h3>Recommended Next Step</h3><p>{toText(output.recommended_next_step)}</p><p><strong>County Verification Needed:</strong> {output.county_verification_needed ? "Yes" : "No"}</p><p><strong>Supervisor Review Needed:</strong> {output.supervisor_review_needed ? "Yes" : "No"}</p><Block title="Sources Used" items={output.sources_used} /></section> : <section><h2>AI Review Guidance</h2><p>No AI review has been run yet.</p></section>}<section><h2>Human Decision History</h2>{decisions.length ? decisions.map((decision: any) => <pre key={decision.id}>{new Date(decision.created_at).toLocaleString()} — {decision.decision}\n{decision.note}</pre>) : <p>No human decision saved yet.</p>}</section><section><h2>Pasted Source Text</h2><pre>{item.raw_record_text}</pre></section></main>;
}
