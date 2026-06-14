import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { getCaseById, getReviewTypeLabel, getStatusBadgeClass, getStatusLabel } from "@/lib/cases";
import { requireUser } from "@/lib/session";

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const item = await getCaseById(id);
  if (!item) notFound();
  const decisions = [
    ["reportable", "Reportable", "closed"],
    ["not_reportable", "Not Reportable", "closed"],
    ["needs_county_verification", "Needs County Verification", "open"],
    ["needs_more_information", "Needs More Information", "open"],
    ["needs_supervisor_review", "Needs Supervisor Review", "needs_supervisor_review"],
    ["possible_non_match_do_not_use", "Possible Non-Match / Do Not Use", "closed"],
  ];

  return (
    <>
      <AppHeader user={user} />
      <main className="container-shell">
        <Link href="/cases" style={{ color: "#0f3b5f", fontWeight: 700 }}>← Back to cases</Link>
        <section className="card" style={{ marginTop: 16, padding: 22 }}>
          <div style={{ alignItems: "start", display: "flex", justifyContent: "space-between", gap: 16 }}>
            <div><h1 style={{ margin: "0 0 8px" }}>{item.subject_name}</h1><p style={{ color: "#5d687b", margin: 0 }}>{getReviewTypeLabel(item.review_type)}</p></div>
            <span className={getStatusBadgeClass(item.status)}>{getStatusLabel(item.status)}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 20 }}>
            <div><strong>DOB</strong><br />{item.dob || "Not entered"}</div>
            <div><strong>Client</strong><br />{item.client_name || "Not entered"}</div>
            <div><strong>Jurisdiction</strong><br />{item.jurisdiction || "Not entered"}</div>
            <div><strong>County/State</strong><br />{[item.county, item.state].filter(Boolean).join(", ") || "Not entered"}</div>
            <div><strong>Source</strong><br />{item.source || "Not entered"}</div>
            <div><strong>Reference</strong><br />{item.external_reference_number || "Not entered"}</div>
          </div>
        </section>
        <section className="card" style={{ marginTop: 18, padding: 22 }}>
          <h2 style={{ marginTop: 0 }}>Pasted Source Text</h2>
          <pre style={{ background: "#f8fafc", borderRadius: 12, overflowX: "auto", padding: 16, whiteSpace: "pre-wrap" }}>{item.raw_record_text}</pre>
        </section>
        <section className="card" style={{ marginTop: 18, padding: 22 }}>
          <h2 style={{ marginTop: 0 }}>Human Review Decision</h2>
          <form action={`/api/cases/${item.id}/decision`} method="post" style={{ display: "grid", gap: 14 }}>
            <select className="field-input" name="decision" required>{decisions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select className="field-input" name="next_status" required>{decisions.map(([value, label, status]) => <option key={value} value={status}>{label} → {getStatusLabel(status)}</option>)}</select>
            <textarea className="field-input" name="note" placeholder="Required decision note" required />
            <button className="btn-primary" type="submit">Save Decision</button>
          </form>
        </section>
        <section style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <form action={`/api/cases/${item.id}/archive`} method="post"><button className="btn-muted" type="submit">Archive</button></form>
          {user.role === "admin" ? <form action={`/api/cases/${item.id}/remove`} method="post"><button className="btn-danger" type="submit">Soft Delete</button></form> : null}
        </section>
      </main>
    </>
  );
}
