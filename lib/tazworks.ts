import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type TazworksConnectionStatus = {
  configured: boolean;
  sandboxMode: boolean;
  baseUrlSet: boolean;
  tokenSet: boolean;
  defaultClientGuidSet: boolean;
  proxyMode: boolean;
  proxyBaseUrlSet: boolean;
  proxySecretSet: boolean;
  checkedAt: string;
};

export type ImportedTazworksSearch = { searchGuid: string; quickReviewId?: string; importedAt?: string };

function cleanBaseUrl() {
  return (process.env.TAZWORKS_API_BASE_URL || "https://api-sandbox.instascreen.net").replace(/\/$/, "");
}

function cleanProxyBaseUrl() {
  return (process.env.TAZWORKS_PROXY_BASE_URL || "").replace(/\/$/, "");
}

function useProxy() {
  return process.env.TAZWORKS_USE_PROXY === "true" || Boolean(cleanProxyBaseUrl());
}

function getBearerCredential() {
  const raw = process.env.TAZWORKS_BEARER_TOKEN || process.env.TAZWORKS_JWT_TOKEN || "";
  return raw.trim().replace(/^Bearer\s+/i, "").trim();
}

function getProxySecret() {
  return String(process.env.TAZWORKS_PROXY_SECRET || "").trim().replace(/^Bearer\s+/i, "").trim();
}

export function getTazworksStatus(): TazworksConnectionStatus {
  const token = getBearerCredential();
  const proxyMode = useProxy();
  const proxySecret = getProxySecret();
  return {
    configured: proxyMode ? Boolean(cleanProxyBaseUrl() && proxySecret) : Boolean(cleanBaseUrl() && token),
    sandboxMode: process.env.TAZWORKS_SANDBOX_MODE !== "false",
    baseUrlSet: Boolean(process.env.TAZWORKS_API_BASE_URL),
    tokenSet: Boolean(token),
    defaultClientGuidSet: Boolean(process.env.TAZWORKS_CLIENT_GUID),
    proxyMode,
    proxyBaseUrlSet: Boolean(cleanProxyBaseUrl()),
    proxySecretSet: Boolean(proxySecret),
    checkedAt: new Date().toISOString(),
  };
}

// TazWorks integration is intentionally READ-ONLY.
// This helper only sends GET requests. In proxy mode, Vercel calls the fixed-IP proxy, and the proxy makes GET-only TazWorks calls.
async function tazworksRequest(path: string) {
  if (useProxy()) {
    const proxyBaseUrl = cleanProxyBaseUrl();
    const proxySecret = getProxySecret();
    if (!proxyBaseUrl) throw new Error("TazWorks proxy base URL is not configured.");
    if (!proxySecret) throw new Error("TazWorks proxy secret is not configured.");
    const response = await fetch(`${proxyBaseUrl}${path.startsWith("/") ? path : `/${path}`}`, { method: "GET", headers: { Authorization: `Bearer ${proxySecret}`, Accept: "application/json" }, cache: "no-store" });
    const text = await response.text();
    let data: any = text;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) throw new Error(typeof data === "object" ? JSON.stringify(data) : String(data));
    return data;
  }
  const token = getBearerCredential();
  if (!token) throw new Error("TazWorks bearer credential is not configured.");
  const url = `${cleanBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" });
  const text = await response.text();
  let data: any = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(typeof data === "object" ? JSON.stringify(data) : String(data));
  return data;
}

export async function listTazworksClients(page = 0, size = 25) {
  return tazworksRequest(`/tazworks/clients?page=${page}&size=${size}`);
}

export async function listTazworksOrders(clientGuid: string, page = 0, size = 10) {
  const proxyClient = clientGuid ? `&clientGuid=${encodeURIComponent(clientGuid)}` : "";
  return tazworksRequest(`/tazworks/orders?page=${page}&size=${size}${proxyClient}`);
}

export async function listTazworksOrderSearches(clientGuid: string, orderGuid: string) {
  const proxyClient = clientGuid ? `?clientGuid=${encodeURIComponent(clientGuid)}` : "";
  return tazworksRequest(`/tazworks/orders/${orderGuid}/searches${proxyClient}`);
}

export async function getTazworksSearchResult(clientGuid: string, orderGuid: string, searchGuid: string, resultType = "EDITOR") {
  const params = new URLSearchParams();
  if (resultType) params.set("resultType", resultType);
  if (clientGuid) params.set("clientGuid", clientGuid);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return tazworksRequest(`/tazworks/orders/${orderGuid}/searches/${searchGuid}/results${suffix}`);
}

export async function getAllTazworksSearchResults(clientGuid: string, orderGuid: string) {
  const suffix = clientGuid ? `?clientGuid=${encodeURIComponent(clientGuid)}` : "";
  return tazworksRequest(`/tazworks/orders/${orderGuid}/searches/results${suffix}`);
}

export function getDefaultTazworksClientGuid() {
  return process.env.TAZWORKS_CLIENT_GUID || "";
}

export function normalizeTazworksPayload(payload: any) {
  const applicant = payload?.applicant || payload?.subject || payload?.candidate || payload?.person || {};
  const report = payload?.report || payload?.screening || payload?.order || payload || {};
  const resultContainer = payload?.results || payload;
  const criminal = resultContainer?.records || payload?.criminal || payload?.criminalRecords || payload?.records || payload?.charges || [];
  const records = Array.isArray(criminal) ? criminal : [criminal].filter(Boolean);
  return {
    applicantName: applicant.name || applicant.fullName || [applicant.firstName, applicant.middleName, applicant.lastName].filter(Boolean).join(" ") || report.applicantName || report.subjectName || payload?.applicantName || "",
    dob: applicant.dob || applicant.dateOfBirth || report.dob || report.dateOfBirth || "",
    reportId: report.id || report.reportId || report.orderId || report.orderGuid || report.reference || payload?.orderSearchGuid || "",
    jurisdiction: resultContainer?.jurisdictionsSearched || report.jurisdiction || report.county || report.state || payload?.displayValue || "",
    source: payload?.type || payload?.displayName || report.source || "TazWorks payload",
    recordCount: records.length,
    records,
  };
}

function offenseText(offense: any) {
  const disposition = offense?.dispositionInfo?.description || offense?.dispositionInfo?.date || offense?.dispositionInfo?.other ? JSON.stringify(offense.dispositionInfo) : "";
  const sentence = offense?.sentenceInfo ? JSON.stringify(offense.sentenceInfo) : "";
  return [
    `Type: ${offense?.type || ""}`,
    `Charge: ${offense?.countOffense || offense?.description || ""}`,
    `Offense Date: ${offense?.offenseDate || ""}`,
    `Disposition: ${disposition}`,
    `Sentence: ${sentence}`,
  ].filter(Boolean).join("\n");
}

export function buildCaseTextFromTazworksPayload(payload: any): string {
  const normalized = normalizeTazworksPayload(payload);
  const recordText = normalized.records.map((record: any, index: number) => {
    const offenses = Array.isArray(record?.offenses) ? record.offenses.map(offenseText).join("\n") : "";
    return [
      `Record ${index + 1}`,
      `Source: ${record?.provider || normalized.source || "TazWorks"}`,
      `Name: ${record?.subject?.fullName || record?.fullName || ""}`,
      `DOB: ${record?.subject?.dateOfBirth || ""}`,
      `Case Number: ${record?.caseNumber || ""}`,
      `Jurisdiction: ${record?.jurisdiction || record?.stateAbbreviation || normalized.jurisdiction || ""}`,
      `File Date: ${record?.fileDate || ""}`,
      offenses,
      JSON.stringify(record, null, 2),
    ].filter(Boolean).join("\n");
  }).join("\n\n");
  return [
    `TazWorks Search Type: ${payload?.type || "Not found"}`,
    `TazWorks Search ID: ${payload?.orderSearchGuid || "Not found"}`,
    `Applicant: ${normalized.applicantName || "Not found"}`,
    `DOB: ${normalized.dob || "Not found"}`,
    `Jurisdiction: ${normalized.jurisdiction || "Not found"}`,
    `Record count: ${normalized.recordCount}`,
    "",
    recordText || JSON.stringify(payload, null, 2),
  ].join("\n");
}

export function reviewTypeFromTazworksPayload(payload: any): "county_search" | "national_crim" {
  const type = String(payload?.type || payload?.displayName || "").toUpperCase();
  return type.includes("COUNTY_CRIMINAL") || type.includes("COUNTY CRIM") ? "county_search" : "national_crim";
}

export async function listTazworksPayloads() {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from("tazworks_payloads").select("*").order("created_at", { ascending: false }).limit(100);
    return data || [];
  } catch {
    return [];
  }
}

export async function getTazworksPayload(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("tazworks_payloads").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getImportedTazworksSearchMap(searchGuids: string[]): Promise<Record<string, ImportedTazworksSearch>> {
  const unique = Array.from(new Set(searchGuids.filter(Boolean)));
  if (!unique.length) return {};
  const out: Record<string, ImportedTazworksSearch> = {};
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from("quick_reviews").select("id,reference_number,created_at").in("reference_number", unique);
    for (const row of data || []) {
      if (row.reference_number) out[row.reference_number] = { searchGuid: row.reference_number, quickReviewId: row.id, importedAt: row.created_at };
    }
  } catch {}
  return out;
}
