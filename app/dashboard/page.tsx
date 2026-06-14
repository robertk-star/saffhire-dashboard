import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { getDashboardCounts } from "@/lib/cases";
import { requireUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await requireUser();
  const counts = await getDashboardCounts();
  const cards = [["Open Reviews", counts.open, "/cases"], ["Needs Supervisor Review", counts.supervisor, "/supervisor"], ["Recently Reviewed Cases", counts.recent, "/cases"], ["Documents Uploaded", counts.documents, "/documents"]];
  return <><AppHeader user={user} /><main className="container-shell">{!counts.configured ? <SetupNotice /> : null}<div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 22 }}><div><h1 style={{ margin: "0 0 8px" }}>Private Review Dashboard</h1><p style={{ color: "#5d687b", margin: 0 }}>Copy/paste case review, document references, and AI guidance for SaffHire staff.</p></div><Link className="btn-primary" href="/cases/new">Start New Review</Link></div><section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>{cards.map(([label, value, href]) => <Link className="card" href={String(href)} key={String(label)} style={{ padding: 20 }}><div style={{ color: "#5d687b", fontWeight: 700 }}>{label}</div><div style={{ fontSize: 38, fontWeight: 900, marginTop: 8 }}>{String(value)}</div></Link>)}</section></main></>;
}
