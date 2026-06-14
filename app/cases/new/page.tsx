import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";

export default async function NewCasePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  return (
    <>
      <AppHeader user={user} />
      <main className="container-shell">
        <h1 style={{ marginTop: 0 }}>Start New Review</h1>
        <p style={{ color: "#5d687b" }}>Paste source information for internal human review. AI review comes in Phase 1B.</p>
        {params.error ? <p style={{ color: "#b42318", fontWeight: 700 }}>Subject name and pasted source text are required.</p> : null}
        <form action="/api/cases" method="post" className="card" style={{ display: "grid", gap: 18, padding: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            <label><span className="field-label">Review type</span><select className="field-input" name="review_type"><option value="criminal_court">Court Review</option><option value="national_database">National Database Review</option></select></label>
            <label><span className="field-label">Subject name</span><input className="field-input" name="subject_name" required /></label>
            <label><span className="field-label">DOB</span><input className="field-input" name="dob" /></label>
            <label><span className="field-label">Client</span><input className="field-input" name="client_name" /></label>
            <label><span className="field-label">Jurisdiction</span><input className="field-input" name="jurisdiction" /></label>
            <label><span className="field-label">County</span><input className="field-input" name="county" /></label>
            <label><span className="field-label">State</span><input className="field-input" name="state" /></label>
            <label><span className="field-label">Source</span><input className="field-input" name="source" /></label>
            <label><span className="field-label">Case/reference number</span><input className="field-input" name="external_reference_number" /></label>
          </div>
          <label><span className="field-label">Pasted source text</span><textarea className="field-input" name="source_text" required /></label>
          <label><span className="field-label">Reviewer notes</span><textarea className="field-input" name="reviewer_notes" style={{ minHeight: 120 }} /></label>
          <div className="card" style={{ background: "#f8fafc", padding: 16 }}><strong>Client-specific rules:</strong> Not configured yet. Placeholder only for Phase 1A.</div>
          <button className="btn-primary" type="submit">Save Case</button>
        </form>
      </main>
    </>
  );
}
