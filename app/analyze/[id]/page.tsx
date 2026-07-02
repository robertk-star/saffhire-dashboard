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

function unique(values: string[], limit = 16) {
  const seen = new Set<string>();
  return values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean).filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

function parseJsonMaybe(value: string) {
  try { return JSON.parse(value); } catch { return null; }
}

function normalizeKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function collectByKey(value: any, match: (key: string) => boolean, output: string[] = []) {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    for (const item of value) collectByKey(item, match, output);
    return output;
  }
  for (const [key, val] of Object.entries(value)) {
    if (match(normalizeKey(key))) output.push(text(val));
    if (val && typeof val === "object") collectByKey(val, match, output);
  }
  return output;
}

function collectAddressObjects(value: any, output: string[] = []) {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    for (const item of value) collectAddressObjects(item, output);
    return output;
  }
  const row = value as Record<string, unknown>;
  const parts = [
    row.addressLine1, row.address1, row.street, row.street1, row.line1,
    row.addressLine2, row.address2, row.street2, row.line2,
    row.city, row.county, row.state, row.zip, row.zipCode, row.postalCode,
  ].map(text).filter(Boolean);
  if (parts.length >= 2) output.push(parts.join(", "));
  for (const [key, val] of Object.entries(row)) {
    const normalized = normalizeKey(key);
    if ((normalized.includes("address") || normalized.includes("residence")) && typeof val === "string") output.push(val);
    if (val && typeof val === "object") collectAddressObjects(val, output);
  }
  return output;
}

function labeledValues(raw: string, labels: string[]) {
  const values: string[] = [];
  const safeLabels = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const nextLabel = "Name Searched|Name On Record|Full Name|Applicant Name|Subject Name|Alias Name|Alias|AKA|DOB Searched|DOB On Record|DOB|Date of Birth|Address History|Address Information|Address|Residence|Case Number|Court|Offense|Charge|Disposition|Arrest Date|File Date|Offense Date|Sentence|Other Info|Other Identifiers";
  for (const label of safeLabels) {
    const pattern = new RegExp(`${label}\\s*[:\\t]?\\s*([\\s\\S]{1,300}?)(?=\\n\\s*(?:${nextLabel})\\s*[:\\t]?|\\n[A-Z][A-Za-z ]{2,40}\\s*[:\\t]|$)`, "gi");
    for (const match of raw.matchAll(pattern)) values.push(String(match[1] || "").trim());
  }
  return values;
}

function cleanRaw(raw: string) {
  return raw
    .replace(/(Alias Name:)/g, "\n$1")
    .replace(/(AKA:)/g, "\n$1")
    .replace(/(DOB Searched\s*:)/g, "\n$1")
    .replace(/(DOB On Record\s*:)/g, "\n$1")
    .replace(/(DOB\s*:)/g, "\n$1")
    .replace(/(Address\s*:)/g, "\n$1")
    .replace(/(Name Variation\(s\) Searched)/g, "\n$1")
    .replace(/(Name Searched\s*)/g, "\n$1")
    .replace(/(Name On Record\s*)/g, "\n$1");
}

function splitPossibleList(value: string) {
  return value.split(/\n|;|\|/g).map((item) => item.trim()).filter(Boolean);
}

function identityFromQuickReview(row: any) {
  const raw = cleanRaw(`${row.full_text || ""}\n${row.pasted_text || ""}`);
  const parsed = parseJsonMaybe(row.pasted_text || "");
  const nameValues = unique([
    row.person_name || "",
    ...collectByKey(parsed, (key) => ["applicantname", "subjectname", "namesearched", "candidatename", "personname", "fullname", "nameonrecord", "displayvalue"].includes(key)),
    ...labeledValues(raw, ["Name Searched", "Applicant Name", "Subject Name", "Full Name", "Name On Record"]),
  ]);
  const aliasValues = unique([
    ...collectByKey(parsed, (key) => key.includes("alias") || key.includes("aka") || key.includes("namevariation") || key.includes("namevariations") || key.includes("othername") || key.includes("previousname")),
    ...labeledValues(raw, ["Alias Name", "Alias", "AKA", "Aliases Found", "Name Variation(s) Searched", "Name Variations Searched"]).flatMap(splitPossibleList),
  ]);
  const dobValues = unique([
    row.dob || "",
    ...collectByKey(parsed, (key) => ["dob", "dateofbirth", "birthdate", "dobs", "dobsearched", "dobonrecord", "birthdt"].includes(key) || key.includes("dateofbirth")),
    ...labeledValues(raw, ["DOB Searched", "DOB On Record", "DOB", "Date of Birth", "Birth Date"]).flatMap(splitPossibleList),
  ]);
  const addressValues = unique([
    ...collectAddressObjects(parsed),
    ...collectByKey(parsed, (key) => key.includes("addresshistory") || key.includes("addresses") || key.includes("residence") || key.includes("citystate")),
    ...labeledValues(raw, ["Address History", "Address Information", "Address", "Residence", "Residential Address"]).flatMap(splitPossibleList),
  ], 20);
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
