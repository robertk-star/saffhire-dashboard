import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type TazworksConnectionStatus = {
  configured: boolean;
  sandboxMode: boolean;
  baseUrlSet: boolean;
  tokenSet: boolean;
  defaultClientGuidSet: boolean;
  checkedAt: string;
};

function cleanBaseUrl() {
  return (process.env.TAZWORKS_API_BASE_URL || "https://api-sandbox.instascreen.net").replace(/\/$/, "");
}

function tokenEnvName() {
  return "TAZWORKS_JWT_TOKEN";
}

export function getTazworksStatus(): TazworksConnectionStatus {
  const token = process.env[tokenEnvName()];
  return {
    configured: Boolean(cleanBaseUrl() && token),
    sandboxMode: process.env.TAZWORKS_SANDBOX_MODE !== "false",
    baseUrlSet: Boolean(process.env.TAZWORKS_API_BASE_URL),
    tokenSet: Boolean(token),
    defaultClientGuidSet: Boolean(process.env.TAZWORKS_CLIENT_GUID),
    checkedAt: new Date().toISOString(),
  };
}

async function tazworksRequest(path: string) {
  const token = process.env[tokenEnvName()];
  if (!token) throw new Error("TazWorks token is not configured.");
  const url = `${cleanBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" });
  const text = await response.text();
  let data: any = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(typeof data === "object" ? JSON.stringify(data) : String(data));
  return data;
}

export async function listTazworksClients(page = 0, size = 25) {
  return tazworksRequest(`/v1/clients?page=${page}&size=${size}`);
}

export async function listTazworksOrders(clientGuid: string, page = 0, size = 25) {
  return tazworksRequest(`/v1/clients/${clientGuid}/orders?page=${page}&size=${size}`);
}

export async function listTazworksOrderSearches(clientGuid: string, orderGuid: string) {
  return tazworksRequest(`/v1/clients/${clientGuid}/orders/${orderGuid}/searches`);
}

export async function getTazworksSearchResult(clientGuid: string, orderGuid: string, searchGuid: string, resultType = "EDITOR") {
  const suffix = resultType ? `?resultType=${encodeURIComponent(resultType)}` : "";
  return tazworksRequest(`/v1/clients/${clientGuid}/orders/${orderGuid}/searches/${searchGuid}/results${suffix}`);
}

export async function getAllTazworksSearchResults(clientGuid: string, orderGuid: string) {
  return tazworksRequest(`/v1/clients/${clientGuid}/orders/${orderGuid}/searches/results`);
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
