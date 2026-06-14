import { AppHeader } from "@/components/AppHeader";
import { CaseTable } from "@/components/CaseTable";
import { listCases } from "@/lib/cases";
import { requireUser } from "@/lib/session";

export default async function SupervisorPage({ searchParams }: { searchParams: Promise<{ reviewType?: string; q?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const params = await searchParams;
  const reviewType = params.reviewType || "";
  const q = params.q || "";
  const cases = await listCases({ status: "needs_supervisor_review", reviewType: reviewType || undefined, q: q || undefined });
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>Supervisor Review Queue</h1><p style={{ color: "#5d687b" }}>Filter cases routed by reviewer decision or AI review.</p><form className="card" style={{ display: "grid", gap: 14, gridTemplateColumns: "2fr 1fr auto", marginBottom: 18, padding: 16 }}><input className="field-input" name="q" defaultValue={q} placeholder="Search supervisor queue" /><select className="field-input" name="reviewType" defaultValue={reviewType}><option value="">All review types</option><option value="criminal_court">Criminal Court</option><option value="national_database">National Database</option></select><button className="btn-secondary" type="submit">Filter</button></form><div style={{ color: "#5d687b", marginBottom: 10 }}>{cases.length} case(s) need supervisor review.</div><CaseTable cases={cases} /></main></>;
}
