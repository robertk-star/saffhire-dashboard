import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { getDashboardCounts } from "@/lib/cases";
import { requireUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await requireUser();
  const counts = await getDashboardCounts();
  const cards = [["Quick Analyze", "Paste", "/analyze"], ["Open Reviews", counts.open, "/cases?status=open"], ["Needs Supervisor Review", counts.supervisor, "/supervisor"], ["Closed Reviews", counts.closed, "/cases?status=closed"], ["Documents Uploaded", counts.documents, "/documents"]];
  const typeCards = [["Criminal Court Reviews", counts.criminalCourt, "/cases?reviewType=criminal_court"], ["National Database Reviews", counts.nationalDatabase, "/cases?reviewType=national_database"], ["All Cases", counts.recent, "/cases"]];
  return <><AppHeader user={user} /><main className="container-shell">{!counts.configured ? <SetupNotice /> : null}<div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 22 }}><div><h1 style={{ margin: "0 0 8px" }}>Private Review Dashboard</h1><p style={{ color: "#5d687b", margin: 0 }}>Fast copy/paste analysis, case review, document references, and workflow tracking.</p></div><div style={{ display: "flex", gap: 12 }}><Link className="btn-primary" href="/analyze">Quick Analyze</Link><Link className="btn-secondary" href="/cases/new">Start New Review</Link></div></div><section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>{cards.map(([label, value, href]) => <Link className="card" href={String(href)} key={String(label)} style={{ padding: 20 }}><div style={{ color: "#5d687b", fontWeight: 700 }}>{label}</div><div style={{ fontSize: 38, fontWeight: 900, marginTop: 8 }}>{String(value)}</div></Link>)}</section><h2 style={{ marginTop: 28 }}>Review Type Breakdown</h2><section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>{typeCards.map(([label, value, href]) => <Link className="card" href={String(href)} key={String(label)} style={{ padding: 20 }}><div style={{ color: "#5d687b", fontWeight: 700 }}>{label}</div><div style={{ fontSize: 34, fontWeight: 900, marginTop: 8 }}>{String(value)}</div></Link>)}</section></main></>;
}
