import Link from "next/link";
import { notFound } from "next/navigation";
import { AiResultView } from "@/components/AiResultView";
import { AppHeader } from "@/components/AppHeader";
import { getQuickAnalysis } from "@/lib/quickAnalyze";
import { requireUser } from "@/lib/session";

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join("; ");
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([key, val]) => `${key}: ${text(val)}`).join("; ");
  return String(value);
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.map((value) => value.trim()).filter(Boolean).filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

function parseJsonMaybe(value: string) {
  try { return JSON.parse(value); } catch { return null; }
}

function collectByKey(value: any, patterns: RegExp[], output: string[] = []) {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    for (const item of value) collectByKey(item, patterns, output);
    return output;
  }
  for (const [key, val] of Object.entries(value)) {
    if (patterns.some((pattern) => pattern.test(key))) output.push(text(val));
    if (val && typeof val === "object") collectByKey(val, patterns, output);
  }
  return output;
}

function regexValues(raw: string, patterns: RegExp[]) {
  const values: string[] = [];
  for (const pattern of patterns) {
    const matches = raw.matchAll(pattern);
    for (const match of matches) values.push(String(match[1] || "").trim());
  }
  return values;
}

function identityFromQuickReview(row: any) {
  const raw = `${row.full_text || ""}\n${row.pasted_text || ""}`;
  const parsed = parseJsonMaybe(row.pasted_text || "");
  const nameValues = unique([
    row.person_name || "",
    ...collectByKey(parsed, [/^(applicantName|subjectName|nameSearched|candidateName|personName|fullName)$/i]),
    ...regexValues(raw, [/Name Searched\s*[:\t]\s*([^\n]+)/gi, /Applicant Name\s*[:\t]\s*([^\n]+)/gi, /Subject Name\s*[:\t]\s*([^\n]+)/gi, /Full Name\s*[:\t]\s*([^\n]+)/gi]),
  ]);
  const aliasValues = unique([
    ...collectByKey(parsed, [/alias/i, /nameVariation/i, /nameVariations/i]),
    ...regexValues(raw, [/Alias(?: Name|es|\(es\) Found|\(es\))?\s*[:\t]\s*([^\n]+)/gi, /Name Variation\(s\) Searched\s*\n?([^\n]+)/gi]),
  ]);
  const dobValues = unique([
    row.dob || "",
    ...collectByKey(parsed, [/^(dob|dateOfBirth|birthDate|dobSearched|dobOnRecord)$/i]),
    ...regexValues(raw, [/DOB(?: Searched| On Record)?\s*[:\t]\s*([^\n]+)/gi, /Date of Birth\s*[:\t]\s*([^\n]+)/gi]),
  ]);
  const addressValues = unique([
    ...collectByKey(parsed, [/address/i, /addressHistory/i, /cityState/i, /residence/i]),
    ...regexValues(raw, [/Address(?: History| Information)?\s*[:\t]\s*([^\n]+)/gi, /Address\s*:\s*([^;\n]+)/gi, /Residence\s*[:\t]\s*([^\n]+)/gi]),
  ]);
  return { names: nameValues, aliases: aliasValues, dobs: dobValues, addresses: addressValues };
}

function IdentityList({ label, values }: { label: string; values: string[] }) {
  return <div><strong>{label}</strong>{values.length ? <ul style={{ lineHeight: 1.7, marginBottom: 0, marginTop: 8 }}>{values.map((value, index) => <li key={index}>{value}</li>)}</ul> : <p style={{ color: "#5d687b", marginBottom: 0 }}>Not found in file.</p>}</div>;
}

function FileIdentityCard({ row }: { row: any }) {
  const identity = identityFromQuickReview(row);
  return <section className="card" style={{ background: "#f8fafc", borderColor: "#0f3b5f", marginTop: 18, padding: 22 }}><h2 style={{ marginTop: 0 }}>Identity Pulled From File</h2><p style={{ color: "#5d687b", marginTop: 0 }}>Use this to verify the analyzer is comparing records against the right person.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}><IdentityList label="Name" values={identity.names} /><IdentityList label="Alias Names" values={identity.aliases} /><IdentityList label="DOB" values={identity.dobs} /><IdentityList label="Address Information" values={identity.addresses} /></div></section>;
}

export default async function QuickAnalysisResultPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const row = await getQuickAnalysis(id);
  if (!row) notFound();
  return <><AppHeader user={user} /><main className="container-shell"><Link href="/analyze" style={{ color: "#0f3b5f", fontWeight: 700 }}>← New Quick Analyze</Link>{query.saved ? <p style={{ color: "#167f49", fontWeight: 700 }}>Saved as a full case.</p> : null}{query.error ? <p style={{ color: "#b42318", fontWeight: 700 }}>Could not save as a case.</p> : null}<section className="card" style={{ marginTop: 16, padding: 22 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><div><h1 style={{ margin: "0 0 8px" }}>Client Display Analysis</h1><p style={{ color: "#5d687b", margin: 0 }}>{row.person_name || "No name"} · {row.review_type === "national_crim" ? "National Crim" : "County Search"}</p></div>{row.case_id ? <Link className="btn-primary" href={`/cases/${row.case_id}`}>Open Saved Case</Link> : <form action={`/api/analyze/${row.id}/create-case`} method="post"><button className="btn-primary" type="submit">Save as Case</button></form>}</div></section><FileIdentityCard row={row} /><section className="card" style={{ marginTop: 18, padding: 22 }}><AiResultView output={row.result_json} sources={row.quick_review_sources || []} /></section><section className="card" style={{ marginTop: 18, padding: 22 }}><h2 style={{ marginTop: 0 }}>Pasted Information</h2><pre style={{ background: "#f8fafc", borderRadius: 12, padding: 16, whiteSpace: "pre-wrap" }}>{row.full_text || row.pasted_text}</pre></section></main></>;
}
