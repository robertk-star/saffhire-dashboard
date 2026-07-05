import Link from "next/link";
import { notFound } from "next/navigation";
import { AiResultView } from "@/components/AiResultView";
import { AppHeader } from "@/components/AppHeader";
import { QuickAnalyzeIdentityCard } from "@/components/QuickAnalyzeIdentityCard";
import { getQuickAnalysis } from "@/lib/quickAnalyze";
import { requireUser } from "@/lib/session";

export default async function QuickAnalysisResultPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser(["admin", "supervisor", "reviewer", "analyzer"]);
  const { id } = await params;
  const query = await searchParams;
  const row = await getQuickAnalysis(id);
  if (!row) notFound();
  const backHref = user.role === "analyzer" ? "/tazworks/saved-analyses" : "/analyze";
  const backLabel = user.role === "analyzer" ? "← Saved Analyses" : "← New Quick Analyze";
  return <><AppHeader user={user} /><main className="container-shell"><div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}><Link href={backHref} style={{ color: "#0f3b5f", fontWeight: 700 }}>{backLabel}</Link>{user.role === "analyzer" ? <Link href="/tazworks/current-orders" style={{ color: "#0f3b5f", fontWeight: 700 }}>Current Orders</Link> : null}</div>{query.saved ? <p style={{ color: "#167f49", fontWeight: 700 }}>Saved as a full case.</p> : null}{query.error ? <p style={{ color: "#b42318", fontWeight: 700 }}>Could not save as a case.</p> : null}<section className="card" style={{ marginTop: 16, padding: 22 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><div><h1 style={{ margin: "0 0 8px" }}>Client Display Analysis</h1><p style={{ color: "#5d687b", margin: 0 }}>{row.person_name || "No name"} · {row.review_type === "national_crim" ? "National Crim" : "County Search"}</p></div>{user.role !== "analyzer" ? row.case_id ? <Link className="btn-primary" href={`/cases/${row.case_id}`}>Open Saved Case</Link> : <form action={`/api/analyze/${row.id}/create-case`} method="post"><button className="btn-primary" type="submit">Save as Case</button></form> : null}</div></section><QuickAnalyzeIdentityCard row={row} /><section className="card" style={{ marginTop: 18, padding: 22 }}><AiResultView output={row.result_json} sources={row.quick_review_sources || []} /></section><section className="card" style={{ marginTop: 18, padding: 22 }}><h2 style={{ marginTop: 0 }}>Pasted Information</h2><pre style={{ background: "#f8fafc", borderRadius: 12, padding: 16, whiteSpace: "pre-wrap" }}>{row.full_text || row.pasted_text}</pre></section></main></>;
}
