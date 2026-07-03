import { NextResponse } from "next/server";
import { getRelevantDocumentChunks } from "@/lib/documents";
import { runOpenAiReview } from "@/lib/openaiReview";
import { requireUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildCaseTextFromTazworksPayload, getTazworksSearchResult, normalizeTazworksPayload, reviewTypeFromTazworksPayload } from "@/lib/tazworks";
import { buildTazworksIdentityText, getTazworksIdentityContext } from "@/lib/tazworksIdentity";
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
  return `${baseReference}:${reviewType}:${Date.now()}`;
}

function capForAnalyzer(value: string) {
  const max = 45000;
  return value.length > max ? `${value.slice(0, max)}\n\n[The source text was shortened before AI analysis. The full text is still saved in SaffHire.]` : value;
}

function cleanString(value: any) {
  return String(value || "").trim();
}

function rateLimitFallback(reviewType: ReviewType, message: string) {
  const label = analyzerLabel(reviewType);
  return {
    review_summary: `${label} could not run because OpenAI returned a rate limit response. The result was saved for manual review and can be retried later.`,
    client_display_recommendation: "Manual review needed before showing this result to the client.",
    subject_names: [],
    records_to_show_client: [],
    records_to_hold_back: [],
    record_reviews: [],
    final_summary: [`${label} was not completed because OpenAI rate-limited the request.`],
    overall_run: [],
    overall_do_not_run: ["Do not make a final client display decision until the analyzer is retried or a human reviewer completes the review."],
    priority_order: [],
    identity_strength: "Needs review",
    identity_match_concerns: ["AI analyzer did not complete due to OpenAI rate limiting."],
    record_completeness: ["Result was pulled and saved, but AI analysis was rate-limited."],
    possible_reportability_issues: ["Manual review required."],
    possible_fcra_concerns: ["Manual review required before reportability/client display decision."],
    county_verification_needed: true,
    missing_information: [message || "OpenAI returned status 429."],
    recommended_next_step: "Retry the analyzer after the OpenAI rate limit clears, or complete manual review.",
    supervisor_review_needed: true,
    confidence: 0.1,
    sources_used: ["Result saved in SaffHire"],
    draft_reviewer_note: "OpenAI rate limit prevented the analyzer from completing. Review manually or retry later.",
  };
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
    const normalized = normalizeTazworksPayload(payload);
    const identityContext = await getTazworksIdentityContext(clientGuid, orderGuid, searchGuid);
    const orderRow = identityContext.orderRow || {};
    const effectiveClientName = cleanString(orderRow.clientName) || clientName;
    const effectiveClientCode = cleanString(orderRow.clientCode) || clientCode;
    const effectiveFileNumber = cleanString(orderRow.fileNumber) || fileNumber;
    const label = clientLabel(effectiveClientName, effectiveClientCode);
    const effectiveApplicantName = cleanString(orderRow.applicantName) || normalized.applicantName || payload?.displayValue || "TazWorks Result";
    const effectiveDob = cleanString(orderRow.applicantDateOfBirth) || normalized.dob || "";
    const importContext = { clientGuid, clientName: effectiveClientName, clientCode: effectiveClientCode, orderGuid, searchGuid, baseReference, analysisReference, fileNumber: effectiveFileNumber, reviewType, analyzer: analyzerLabel(reviewType), importedAt: new Date().toISOString(), tazworksMutation: false, orderApplicantName: orderRow.applicantName || null, orderApplicantDateOfBirth: orderRow.applicantDateOfBirth || null, orderApplicantEmail: orderRow.applicantEmail || null, orderProductName: orderRow.productName || null, orderClientProductGuid: orderRow.clientProductGuid || null };
    const identityText = buildTazworksIdentityText({ payload, orderRow, searchRow: identityContext.searchRow, fallbackName: effectiveApplicantName, fallbackDob: effectiveDob });
    const storedPayload = { ...payload, _saffhireImportContext: importContext, _saffhireOrderContext: orderRow, _saffhireSearchContext: identityContext.searchRow };
    const fullText = `${buildImportHeader({ label, clientGuid, clientCode: effectiveClientCode, orderGuid, searchGuid, fileNumber: effectiveFileNumber, reviewType, baseReference, analysisReference })}${identityText}${buildCaseTextFromTazworksPayload(payload)}`;
    const analyzerText = capForAnalyzer(fullText);
    const chunks = await getRelevantDocumentChunks(analyzerText, 10);
    const caseRecord = { review_type: reviewType, subject_name: effectiveApplicantName, dob: effectiveDob || null, jurisdiction: normalized.jurisdiction || null, county: null, state: null, source: `TazWorks ${payload?.type || "Search Result"} - ${label}${effectiveFileNumber ? ` - File #${effectiveFileNumber}` : ""} - ${analyzerLabel(reviewType)}`, external_reference_number: analysisReference, raw_record_text: analyzerText };
    let output: any;
    try { output = await runOpenAiReview({ caseRecord, chunks }); } catch (aiError: any) { const aiMessage = String(aiError?.message || "AI review failed"); if (!aiMessage.includes("429")) throw aiError; output = rateLimitFallback(reviewType, aiMessage); }
    const { data: quickRow, error } = await supabase.from("quick_reviews").insert({ review_type: reviewType, source_type: `TazWorks ${payload?.type || "Search Result"} - ${label}${effectiveFileNumber ? ` - File #${effectiveFileNumber}` : ""} - ${analyzerLabel(reviewType)}`, person_name: effectiveApplicantName || null, dob: effectiveDob || null, state: null, county: null, reference_number: analysisReference, charge: null, disposition: null, disposition_date: null, sentence: null, pasted_text: JSON.stringify(storedPayload, null, 2), full_text: fullText, result_json: output, created_by: user.email }).select("id").single();
    if (error || !quickRow) return NextResponse.redirect(new URL(`${resultUrl}&error=quick_save`, request.url), 303);
    await supabase.from("tazworks_payloads").insert({ label: `API ${payload?.type || "Search Result"} - ${label}${effectiveFileNumber ? ` - File #${effectiveFileNumber}` : ""} - ${analyzerLabel(reviewType)}`, payload: storedPayload, applicant_name: effectiveApplicantName || null, dob: effectiveDob || null, report_id: analysisReference, record_count: normalized.recordCount || 0, imported_by_email: user.email });
    if (chunks.length) await supabase.from("quick_review_sources").insert(chunks.map((chunk: any, index: number) => ({ quick_review_id: quickRow.id, source_label: `${index + 1}. ${chunk.documents?.document_name || "Uploaded document"}`, source_excerpt: chunk.chunk_text.slice(0, 900) })));
    await writeAuditLog({ user, action: "tazworks_search_result_imported_read_only", entityType: "quick_review", entityId: quickRow.id, metadata: { ...importContext, searchType: payload?.type || null, aiRateLimited: output?.confidence === 0.1 } });
    return NextResponse.redirect(new URL(`/analyze/${quickRow.id}`, request.url), 303);
  } catch (err: any) {
    const reason = encodeURIComponent(String(err?.message || "import_failed").slice(0, 180));
    return NextResponse.redirect(new URL(`${resultUrl}&error=import_failed&detail=${reason}`, request.url), 303);
  }
}
