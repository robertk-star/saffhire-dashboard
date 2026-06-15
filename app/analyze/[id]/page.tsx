import Link from "next/link";
import { notFound } from "next/navigation";
import { AiResultView } from "@/components/AiResultView";
import { AppHeader } from "@/components/AppHeader";
import { getQuickAnalysis } from "@/lib/quickAnalyze";
import { requireUser } from "@/lib/session";

export default async function QuickAnalysisResultPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const row = await getQuickAnalysis(id);
  if (!row) notFound();
  return <><AppHeader user={user} /><main className="container-shell"><Link href="/analyze" style={{ color: "#0f3b5f", fontWeight: 700 }}>← New Quick Analyze</Link>{query.saved ? <p style={{ color: "#167f49", fontWeight: 700 }}>Saved as a full case.</p> : null}{query.error ? <p style={{ color: "#b42318", fontWeight: 700 }}>Could not save as a case.</p> : null}<section className="card" style={{ marginTop: 16, padding: 22 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><div><h1 style={{ margin: "0 0 8px" }}>Quick Analysis Result</h1><p style={{ color: "#5d687b", margin: 0 }}>{row.person_name || "No subject name"} · {row.review_type}</p></div>{row.case_id ? <Link className="btn-primary" href={`/cases/${row.case_id}`}>Open Saved Case</Link> : <form action={`/api/analyze/${row.id}/create-case`} method="post"><button className="btn-primary" type="submit">Save as Case</button></form>}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 18 }}><div><strong>DOB</strong><br />{row.dob || "Not entered"}</div><div><strong>County/State</strong><br />{[row.county, row.state].filter(Boolean).join(", ") || "Not entered"}</div><div><strong>Reference</strong><br />{row.reference_number || "Not entered"}</div><div><strong>Disposition</strong><br />{row.disposition || "Not entered"}</div></div></section><section className="card" style={{ marginTop: 18, padding: 22 }}><AiResultView output={row.result_json} sources={row.quick_review_sources || []} /></section><section className="card" style={{ marginTop: 18, padding: 22 }}><h2 style={{ marginTop: 0 }}>Pasted Text</h2><pre style={{ background: "#f8fafc", borderRadius: 12, padding: 16, whiteSpace: "pre-wrap" }}>{row.pasted_text}</pre></section></main></>;
}
