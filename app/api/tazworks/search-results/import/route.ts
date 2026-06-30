import { NextResponse } from "next/server";
import { getRelevantDocumentChunks } from "@/lib/documents";
import { runOpenAiReview } from "@/lib/openaiReview";
import { requireUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildCaseTextFromTazworksPayload, getImportedTazworksSearchMap, getTazworksSearchResult, normalizeTazworksPayload, reviewTypeFromTazworksPayload } from "@/lib/tazworks";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

function clientLabel(name: string, code: string) {
  if (name && code) return `${name} (${code})`;
  return name || code || "Unknown client";
}

export async function POST(request: Request) {
  const user = await requireUser(["admin", "supervisor"]);
  const formData = await request.formData();
  const clientGuid = String(formData.get("clientGuid") || "");
  const clientName = String(formData.get("clientName") || "");
  const clientCode = String(formData.get("clientCode") || "");
  const orderGuid = String(formData.get("orderGuid") || "");
  const searchGuid = String(formData.get("searchGuid") || "");
  const confirmed = String(formData.get("confirmReadOnlyImport") || "") === "yes";
  if (!clientGuid || !orderGuid || !searchGuid) return NextResponse.redirect(new URL("/tazworks?error=missing_tazworks_ids", request.url), 303);
  if (!confirmed) return NextResponse.redirect(new URL(`/tazworks/orders/${orderGuid}/searches/${searchGuid}?clientGuid=${encodeURIComponent(clientGuid)}&clientName=${encodeURIComponent(clientName)}&clientCode=${encodeURIComponent(clientCode)}&error=confirm_required`, request.url), 303);
  try {
    const existing = await getImportedTazworksSearchMap([searchGuid]);
    if (existing[searchGuid]?.quickReviewId) return NextResponse.redirect(new URL(`/analyze/${existing[searchGuid].quickReviewId}`, request.url), 303);
    const payload = await getTazworksSearchResult(clientGuid, orderGuid, searchGuid);
    const importContext = { clientGuid, clientName, clientCode, orderGuid, searchGuid, importedAt: new Date().toISOString(), tazworksMutation: false };
    const storedPayload = { ...payload, _saffhireImportContext: importContext };
    const normalized = normalizeTazworksPayload(payload);
    const reviewType = reviewTypeFromTazworksPayload(payload);
    const fullText = buildCaseTextFromTazworksPayload(payload);
    const chunks = await getRelevantDocumentChunks(fullText, 10);
    const label = clientLabel(clientName, clientCode);
    const caseRecord = { review_type: reviewType, subject_name: normalized.applicantName || payload?.displayValue || "TazWorks Result", dob: normalized.dob || null, jurisdiction: normalized.jurisdiction || null, county: null, state: null, source: `TazWorks ${payload?.type || "Search Result"} - ${label}`, external_reference_number: payload?.orderSearchGuid || searchGuid, raw_record_text: fullText };
    const output = await runOpenAiReview({ caseRecord, chunks });
    const supabase = getSupabaseAdmin();
    const { data: quickRow, error } = await supabase.from("quick_reviews").insert({ review_type: reviewType, source_type: `TazWorks ${payload?.type || "Search Result"} - ${label}`, person_name: normalized.applicantName || payload?.displayValue || null, dob: normalized.dob || null, state: null, county: null, reference_number: payload?.orderSearchGuid || searchGuid, charge: null, disposition: null, disposition_date: null, sentence: null, pasted_text: JSON.stringify(storedPayload, null, 2), full_text: fullText, result_json: output, created_by: user.email }).select("id").single();
    if (error || !quickRow) return NextResponse.redirect(new URL("/tazworks?error=quick_save", request.url), 303);
    await supabase.from("tazworks_payloads").insert({ label: `API ${payload?.type || "Search Result"} - ${label}`, payload: storedPayload, applicant_name: normalized.applicantName || null, dob: normalized.dob || null, report_id: payload?.orderSearchGuid || searchGuid, record_count: normalized.recordCount || 0, imported_by_email: user.email });
    if (chunks.length) await supabase.from("quick_review_sources").insert(chunks.map((chunk: any, index: number) => ({ quick_review_id: quickRow.id, source_label: `${index + 1}. ${chunk.documents?.document_name || "Uploaded document"}`, source_excerpt: chunk.chunk_text.slice(0, 900) })));
    await writeAuditLog({ user, action: "tazworks_search_result_imported_read_only", entityType: "quick_review", entityId: quickRow.id, metadata: { ...importContext, searchType: payload?.type || null } });
    return NextResponse.redirect(new URL(`/analyze/${quickRow.id}`, request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/tazworks?error=import_failed", request.url), 303);
  }
}
