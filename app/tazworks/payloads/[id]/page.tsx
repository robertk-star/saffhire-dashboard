import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { getTazworksPayload, buildCaseTextFromTazworksPayload } from "@/lib/tazworks";
import { requireUser } from "@/lib/session";

export default async function TazworksPayloadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ imported?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const { id } = await params;
  const query = await searchParams;
  const row = await getTazworksPayload(id);
  if (!row) notFound();
  return <><AppHeader user={user} /><main className="container-shell"><Link href="/tazworks" style={{ color: "#0f3b5f", fontWeight: 700 }}>← Back to TazWorks</Link>{query.imported ? <p style={{ color: "#167f49", fontWeight: 700 }}>Payload imported and case created.</p> : null}<section className="card" style={{ marginTop: 16, padding: 22 }}><h1 style={{ marginTop: 0 }}>{row.label || "TazWorks Payload"}</h1><p><strong>Applicant:</strong> {row.applicant_name || "Not found"}</p><p><strong>DOB:</strong> {row.dob || "Not found"}</p><p><strong>Report ID:</strong> {row.report_id || "Not found"}</p><p><strong>Record Count:</strong> {row.record_count || 0}</p>{row.mapped_case_id ? <Link className="btn-primary" href={`/cases/${row.mapped_case_id}`}>Open Created Case</Link> : null}</section><section className="card" style={{ marginTop: 18, padding: 22 }}><h2 style={{ marginTop: 0 }}>Mapped Case Text Preview</h2><pre style={{ background: "#f8fafc", borderRadius: 12, padding: 16, whiteSpace: "pre-wrap" }}>{buildCaseTextFromTazworksPayload(row.payload)}</pre></section><section className="card" style={{ marginTop: 18, padding: 22 }}><h2 style={{ marginTop: 0 }}>Raw Payload</h2><pre style={{ background: "#f8fafc", borderRadius: 12, padding: 16, overflowX: "auto", whiteSpace: "pre-wrap" }}>{JSON.stringify(row.payload, null, 2)}</pre></section></main></>;
}
