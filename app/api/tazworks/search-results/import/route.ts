import { NextResponse } from "next/server";
import { getRelevantDocumentChunks } from "@/lib/documents";
import { runOpenAiReview } from "@/lib/openaiReview";
import { requireUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildCaseTextFromTazworksPayload, getTazworksSearchResult, normalizeTazworksPayload, reviewTypeFromTazworksPayload } from "@/lib/tazworks";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

type ReviewType = "county_search" | "national_crim";

function clientLabel(name: string, code: string) {
  if (name && code) return `${name} (${code})`;
  return name || code || "Unknown client";
}

function selectedReviewType(value: FormDataEntryValue | null, payload: any): ReviewType {
  const requested = String(value || "");
  if (requested === "county_search" || requested === "national_crim") return requested;
  return reviewTypeFromTazworksPayload(payload);
}

function analyzerLabel(reviewType: ReviewType) {
  return reviewType === "county_search" ? "County Criminal Analysis" : "National Criminal Analysis";
}

function buildAnalysisReference(baseReference: string, reviewType: ReviewType) {
  return `${baseReference}:${reviewType}`;
}

function capForAnalyzer(value: string) {
  const max = 45000;
  return value.length > max ? `${value.slice(0, max)}\n\n[The TazWorks source text was shortened before AI analysis to avoid model size limits. The full text is still saved in SaffHire.]` : value;
}

function buildImportHeader(input: { label: string; clientGuid: string; clientCode: string; orderGuid: string; searchGuid: string; fileNumber: string; reviewType: ReviewType; baseReference: string; analysisReference: string }) {
  return [
    "TazWorks Import Context",
    `Client: ${input.label}`,
    `Client Code: ${input.clientCode || "Not provided"}`,
    `Client GUID: ${input.clientGuid}`,
    `Order GUID: ${input.orderGuid}`,
    `Search GUID: ${input.searchGuid}`,
    `TazWorks Reference: ${input.baseReference}`,
    `Analysis Reference: ${input.analysisReference}`,
    `File Number: ${input.fileNumber || "Not provided"}`,
    `Selected Analyzer: ${analyzerLabel(input.reviewType)}`,
    "TazWorks mutation: false - read-only import",
    "",
  ].join("\n");
}

export async function POST(request: Request) {
  const user = await requireUser(["admin", "supervisor"]);
  const formData = await request.formData();
  const clientGuid = String(formData.get("clientGuid") || "");
  const clientName = String(formData.get("clientName") || "");
  const clientCode = String(formData.get("clientCode") || "");
  const orderGuid = String(formData.get("orderGuid") || "");
  const searchGuid = String(formData.get("searchGuid") || "");
  const fileNumber = String(formData.get("fileNumber") || "");
  const confirmed = String(formData.get("confirmReadOnlyImport") || "") === "yes";
  const resultUrl = `/tazworks/orders/${orderGuid}/searches/${searchGuid}?clientGuid=${encodeURIComponent(clientGuid)}&clientName=${encodeURIComponent(clientName)}&clientCode=${encodeURIComponent(clientCode)}&fileNumber=${encodeURIComponent(fileNumber)}`;
  if (!clientGuid || !orderGuid || !searchGuid) return NextResponse.redirect(new URL("/tazworks?error=missing_tazworks_ids", request.url), 303);
  if (!confirmed) return NextResponse.redirect(new URL(`${resultUrl}&error=confirm_required`, request.url), 303);
  try {
    const payload = await getTazworksSearchResult(clientGuid, orderGuid, searchGuid);
    const reviewType = selectedReviewType(formData.get("reviewType"), payload);
    const baseReference = String(payload?.orderSearchGuid || searchGuid);
    const analysisReference = buildAnalysisReference(baseReference, reviewType);
    const supabase = getSupabaseAdmin();
    const { data: existingRows } = await supabase.from("quick_reviews").select("id").eq("reference_number", analysisReference).limit(1);
    const existing = existingRows?.[0];
    if (existing?.id) return NextResponse.redirect(new URL(`/analyze/${existing.id}`, request.url), 303);
    const label = clientLabel(clientName, clientCode);
    const importContext = { clientGuid, clientName, clientCode, orderGuid, searchGuid, baseReference, analysisReference, fileNumber, reviewType, analyzer: analyzerLabel(reviewType), importedAt: new Date().toISOString(), tazworksMutation: false };
    const storedPayload = { ...payload, _saffhireImportContext: importContext };
    const normalized = normalizeTazworksPayload(payload);
    const fullText = `${buildImportHeader({ label, clientGuid, clientCode, orderGuid, searchGuid, fileNumber, reviewType, baseReference, analysisReference })}${buildCaseTextFromTazworksPayload(payload)}`;
    const analyzerText = capForAnalyzer(fullText);
    const chunks = await getRelevantDocumentChunks(analyzerText, 10);
    const caseRecord = { review_type: reviewType, subject_name: normalized.applicantName || payload?.displayValue || "TazWorks Result", dob: normalized.dob || null, jurisdiction: normalized.jurisdiction || null, county: null, state: null, source: `TazWorks ${payload?.type || "Search Result"} - ${label}${fileNumber ? ` - File #${fileNumber}` : ""} - ${analyzerLabel(reviewType)}`, external_reference_number: analysisReference, raw_record_text: analyzerText };
    const output = await runOpenAiReview({ caseRecord, chunks });
    const { data: quickRow, error } = await supabase.from("quick_reviews").insert({ review_type: reviewType, source_type: `TazWorks ${payload?.type || "Search Result"} - ${label}${fileNumber ? ` - File #${fileNumber}` : ""} - ${analyzerLabel(reviewType)}`, person_name: normalized.applicantName || payload?.displayValue || null, dob: normalized.dob || null, state: null, county: null, reference_number: analysisReference, charge: null, disposition: null, disposition_date: null, sentence: null, pasted_text: JSON.stringify(storedPayload, null, 2), full_text: fullText, result_json: output, created_by: user.email }).select("id").single();
    if (error || !quickRow) return NextResponse.redirect(new URL(`${resultUrl}&error=quick_save`, request.url), 303);
    await supabase.from("tazworks_payloads").insert({ label: `API ${payload?.type || "Search Result"} - ${label}${fileNumber ? ` - File #${fileNumber}` : ""} - ${analyzerLabel(reviewType)}`, payload: storedPayload, applicant_name: normalized.applicantName || null, dob: normalized.dob || null, report_id: analysisReference, record_count: normalized.recordCount || 0, imported_by_email: user.email });
    if (chunks.length) await supabase.from("quick_review_sources").insert(chunks.map((chunk: any, index: number) => ({ quick_review_id: quickRow.id, source_label: `${index + 1}. ${chunk.documents?.document_name || "Uploaded document"}`, source_excerpt: chunk.chunk_text.slice(0, 900) })));
    await writeAuditLog({ user, action: "tazworks_search_result_imported_read_only", entityType: "quick_review", entityId: quickRow.id, metadata: { ...importContext, searchType: payload?.type || null } });
    return NextResponse.redirect(new URL(`/analyze/${quickRow.id}`, request.url), 303);
  } catch (err: any) {
    const reason = encodeURIComponent(String(err?.message || "import_failed").slice(0, 180));
    return NextResponse.redirect(new URL(`${resultUrl}&error=import_failed&detail=${reason}`, request.url), 303);
  }
}
