import { AiResultView } from "@/components/AiResultView";

export function AiReviewPanel({ caseId, latestReview }: { caseId: string; latestReview: any }) {
  const output = latestReview?.structured_output || null;
  const sources = latestReview?.ai_review_sources || [];
  return (
    <section className="card" style={{ marginTop: 18, padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div><h2 style={{ margin: 0 }}>AI Review Guidance</h2><p style={{ color: "#5d687b", marginBottom: 0 }}>Guidance only. Final decision requires SaffHire human review.</p></div>
        <form action={`/api/cases/${caseId}/ai-review`} method="post"><button className="btn-primary" type="submit">Run AI Review</button></form>
      </div>
      <div style={{ marginTop: 18 }}>
        {!output ? <p style={{ color: "#5d687b" }}>No AI review has been run yet.</p> : <AiResultView output={output} sources={sources} />}
      </div>
    </section>
  );
}
