import { NextResponse } from "next/server";
import { buildCaseTextFromTazworksPayload, normalizeTazworksPayload } from "@/lib/tazworks";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser(["admin", "supervisor"]);
  const formData = await request.formData();
  const label = String(formData.get("label") || "TazWorks sample payload").trim();
  const raw = String(formData.get("payload") || "").trim();
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return NextResponse.redirect(new URL("/tazworks/import?error=json", request.url), 303); }
  const normalized = normalizeTazworksPayload(payload);
  const sourceText = buildCaseTextFromTazworksPayload(payload);
  const supabase = getSupabaseAdmin();
  const { data: caseRow, error: caseError } = await supabase.from("cases").insert({ review_type: "national_database", subject_name: normalized.applicantName || "TazWorks Imported Subject", dob: normalized.dob || null, jurisdiction: normalized.jurisdiction || null, source: "TazWorks sample import", external_reference_number: normalized.reportId || null, client_rules_status: "not_configured", raw_record_text: sourceText, reviewer_notes: `Imported from TazWorks sample JSON: ${label}`, created_by_email: user.email }).select("id").single();
  if (caseError) throw caseError;
  const { data: payloadRow, error: payloadError } = await supabase.from("tazworks_payloads").insert({ label, payload, applicant_name: normalized.applicantName || null, dob: normalized.dob || null, report_id: normalized.reportId || null, record_count: normalized.recordCount || 0, mapped_case_id: caseRow.id, imported_by_email: user.email }).select("id").single();
  if (payloadError) throw payloadError;
  await writeAuditLog({ user, action: "tazworks_payload_imported", entityType: "tazworks_payload", entityId: payloadRow.id, metadata: { mappedCaseId: caseRow.id } });
  return NextResponse.redirect(new URL(`/tazworks/payloads/${payloadRow.id}?imported=1`, request.url), 303);
}
