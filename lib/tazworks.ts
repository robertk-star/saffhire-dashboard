import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type TazworksConnectionStatus = {
  configured: boolean;
  sandboxMode: boolean;
  baseUrlSet: boolean;
  clientIdSet: boolean;
  clientSecretSet: boolean;
  checkedAt: string;
};

export function getTazworksStatus(): TazworksConnectionStatus {
  return {
    configured: Boolean(process.env.TAZWORKS_API_BASE_URL && process.env.TAZWORKS_CLIENT_ID && process.env.TAZWORKS_CLIENT_SECRET),
    sandboxMode: process.env.TAZWORKS_SANDBOX_MODE !== "false",
    baseUrlSet: Boolean(process.env.TAZWORKS_API_BASE_URL),
    clientIdSet: Boolean(process.env.TAZWORKS_CLIENT_ID),
    clientSecretSet: Boolean(process.env.TAZWORKS_CLIENT_SECRET),
    checkedAt: new Date().toISOString(),
  };
}

export function normalizeTazworksPayload(payload: any) {
  const applicant = payload?.applicant || payload?.subject || payload?.candidate || payload?.person || {};
  const report = payload?.report || payload?.screening || payload?.order || payload || {};
  const criminal = payload?.criminal || payload?.criminalRecords || payload?.records || payload?.charges || [];
  const records = Array.isArray(criminal) ? criminal : [criminal].filter(Boolean);
  return {
    applicantName: applicant.name || applicant.fullName || [applicant.firstName, applicant.middleName, applicant.lastName].filter(Boolean).join(" ") || report.applicantName || report.subjectName || "",
    dob: applicant.dob || applicant.dateOfBirth || report.dob || report.dateOfBirth || "",
    reportId: report.id || report.reportId || report.orderId || report.reference || "",
    jurisdiction: report.jurisdiction || report.county || report.state || "",
    source: report.source || "TazWorks payload",
    recordCount: records.length,
    records,
  };
}

export function buildCaseTextFromTazworksPayload(payload: any): string {
  const normalized = normalizeTazworksPayload(payload);
  const recordText = normalized.records.map((record: any, index: number) => `Record ${index + 1}:\n${JSON.stringify(record, null, 2)}`).join("\n\n");
  return [
    `TazWorks Report ID: ${normalized.reportId || "Not found"}`,
    `Applicant: ${normalized.applicantName || "Not found"}`,
    `DOB: ${normalized.dob || "Not found"}`,
    `Jurisdiction: ${normalized.jurisdiction || "Not found"}`,
    `Record count: ${normalized.recordCount}`,
    "",
    recordText || JSON.stringify(payload, null, 2),
  ].join("\n");
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
