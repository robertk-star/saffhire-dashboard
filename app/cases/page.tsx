import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CaseTable } from "@/components/CaseTable";
import { listCases } from "@/lib/cases";
import { requireUser } from "@/lib/session";

export default async function CasesPage({ searchParams }: { searchParams: Promise<{ status?: string; reviewType?: string; q?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const status = params.status || "";
  const reviewType = params.reviewType || "";
  const q = params.q || "";
  const cases = await listCases({ status: status || undefined, reviewType: reviewType || undefined, q: q || undefined });
  return <><AppHeader user={user} /><main className="container-shell"><div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 20 }}><div><h1 style={{ margin: 0 }}>Cases</h1><p style={{ color: "#5d687b" }}>Search by name, DOB, client, case number, county, state, source, or pasted text.</p></div><Link className="btn-primary" href="/cases/new">Start New Review</Link></div><form className="card" style={{ display: "grid", gap: 14, gridTemplateColumns: "2fr 1fr 1fr auto", marginBottom: 18, padding: 16 }}><input className="field-input" name="q" defaultValue={q} placeholder="Search cases" /><select className="field-input" name="status" defaultValue={status}><option value="">All statuses</option><option value="open">Open</option><option value="needs_supervisor_review">Supervisor Review</option><option value="closed">Closed</option><option value="archived">Archived</option></select><select className="field-input" name="reviewType" defaultValue={reviewType}><option value="">All review types</option><option value="criminal_court">Criminal Court</option><option value="national_database">National Database</option></select><button className="btn-secondary" type="submit">Filter</button></form><div style={{ color: "#5d687b", marginBottom: 10 }}>{cases.length} case(s) shown.</div><CaseTable cases={cases} /></main></>;
}
