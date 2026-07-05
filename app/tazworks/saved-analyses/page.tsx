import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join("; ");
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([key, val]) => `${key}: ${text(val)}`).join("; ");
  return String(value);
}

function shortDate(value?: string | null) {
  if (!value) return "";
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function lineValue(raw: string, label: string) {
  const prefix = `${label}:`.toLowerCase();
  const found = raw.split(/\r?\n/g).find((line) => line.trim().toLowerCase().startsWith(prefix));
  return found ? found.slice(found.indexOf(":") + 1).trim() : "";
}

function analysisType(row: any) {
  return row.review_type === "county_search" ? "County Criminal" : "National Crim";
}

function decisionSummary(row: any) {
  const result = row.result_json || {};
  const records = Array.isArray(result.record_reviews) ? result.record_reviews : [];
  if (records.length) {
    const yesCount = records.filter((record: any) => String(record.county_search_required || record.report_to_client || record.show_to_client || "").toLowerCase().includes("yes") || record.county_search_required === true || record.report_to_client === true || record.show_to_client === true).length;
    const noCount = records.filter((record: any) => String(record.county_search_required || record.report_to_client || record.show_to_client || "").toLowerCase().includes("no") || record.county_search_required === false || record.report_to_client === false || record.show_to_client === false).length;
    return `${records.length} record${records.length === 1 ? "" : "s"}; ${yesCount} yes / ${noCount} no`;
  }
  return text(result.recommended_next_step || result.review_summary).slice(0, 120) || "Saved analysis";
}

function fileNumber(row: any) {
  const result = row.result_json || {};
  return text(result.file_number) || lineValue(String(row.full_text || row.pasted_text || ""), "File Number");
}

function orderGuid(row: any) {
  const result = row.result_json || {};
  return text(result.order_guid) || lineValue(String(row.full_text || row.pasted_text || ""), "Order GUID");
}

function searchGuid(row: any) {
  const result = row.result_json || {};
  return text(result.search_guid) || lineValue(String(row.full_text || row.pasted_text || ""), "Search GUID") || text(row.reference_number);
}

export default async function SavedAnalysesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await requireUser(["admin", "supervisor", "analyzer"]);
  const params = await searchParams;
  const type = params.type || "all";
  const supabase = getSupabaseAdmin();
  let query = supabase.from("quick_reviews").select("id,review_type,person_name,dob,source_type,reference_number,created_at,created_by,full_text,pasted_text,result_json").in("review_type", ["national_crim", "county_search"]).order("created_at", { ascending: false }).limit(100);
  if (type === "national") query = query.eq("review_type", "national_crim");
  if (type === "county") query = query.eq("review_type", "county_search");
  const { data, error } = await query;
  const rows = data || [];
  return <><AppHeader user={user} /><main className="container-shell"><div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 18 }}><div><h1 style={{ margin: "0 0 8px" }}>Saved Analyses</h1><p style={{ color: "#5d687b", margin: 0 }}>Review prior National Crim and County Criminal analyses without rerunning AI.</p></div><Link className="btn-primary" href="/tazworks/current-orders">Current Orders</Link></div><section className="card" style={{ padding: 18, marginBottom: 18 }}><form method="get" action="/tazworks/saved-analyses" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}><label><span className="field-label">Type</span><select className="field-input" name="type" defaultValue={type}><option value="all">All Analyses</option><option value="national">National Crim</option><option value="county">County Criminal</option></select></label><button className="btn-primary" type="submit">Filter</button><Link className="btn-secondary" href="/tazworks/saved-analyses">Clear</Link></form></section>{error ? <section className="card" style={{ background: "#fff5f5", borderColor: "#fda29b", color: "#b42318", fontWeight: 700, padding: 16 }}>Saved analyses could not load.</section> : null}<section className="card table-wrap"><div style={{ padding: 18 }}><h2 style={{ margin: 0 }}>Saved Results</h2><p style={{ color: "#5d687b", marginBottom: 0 }}>{rows.length} saved analysis record{rows.length === 1 ? "" : "s"} shown.</p></div><table><thead><tr><th>Date</th><th>Type</th><th>File #</th><th>Applicant</th><th>DOB</th><th>Order/Search</th><th>Ran By</th><th>Summary</th><th>Action</th></tr></thead><tbody>{rows.length ? rows.map((row: any) => <tr key={row.id}><td>{shortDate(row.created_at)}</td><td>{analysisType(row)}</td><td>{fileNumber(row)}</td><td>{row.person_name || ""}</td><td>{row.dob || ""}</td><td><div style={{ fontSize: 12, lineHeight: 1.5 }}>Order: {orderGuid(row) || "—"}<br />Search: {searchGuid(row) || "—"}</div></td><td>{row.created_by || ""}</td><td>{decisionSummary(row)}</td><td><Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/analyze/${row.id}`}>Open</Link></td></tr>) : <tr><td colSpan={9}>No saved analyses found.</td></tr>}</tbody></table></section></main></>;
}
