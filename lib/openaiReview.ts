import { applySaffhireReportability } from "@/lib/reportability";

export type AiReviewOutput = {
  review_summary: string;
  client_display_recommendation: string;
  subject_names: string[];
  records_to_show_client: string[];
  records_to_hold_back: string[];
  record_reviews: any[];
  final_summary: string[];
  overall_run: string[];
  overall_do_not_run: string[];
  priority_order: string[];
  identity_strength: string;
  identity_match_concerns: string[];
  record_completeness: string[];
  possible_reportability_issues: string[];
  possible_fcra_concerns: string[];
  county_verification_needed: boolean;
  missing_information: string[];
  recommended_next_step: string;
  supervisor_review_needed: boolean;
  confidence: number;
  sources_used: string[];
  draft_reviewer_note: string;
};

function text(value: unknown): string { if (value === null || value === undefined) return ""; if (typeof value === "string") return value; if (typeof value === "number" || typeof value === "boolean") return String(value); if (Array.isArray(value)) return value.map(text).filter(Boolean).join("; "); if (typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([key, val]) => `${key}: ${text(val)}`).join("; "); return String(value); }
function list(value: unknown): string[] { if (Array.isArray(value)) return value.map(text).filter(Boolean); const one = text(value); return one ? [one] : []; }
function bool(value: unknown, fallback = false): boolean { if (typeof value === "boolean") return value; if (typeof value === "string") return ["yes", "true", "needed", "required"].includes(value.toLowerCase()); return fallback; }
function confidence(value: unknown): number { if (typeof value === "number") return Math.max(0, Math.min(1, value > 1 ? value / 100 : value)); const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed)) : 0.5; }
function objectList(value: unknown): any[] { return Array.isArray(value) ? value : []; }

export function normalizeAiReviewOutput(raw: unknown): AiReviewOutput {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const normalized = {
    review_summary: text(row.review_summary) || "AI review completed, but no summary was provided.",
    client_display_recommendation: text(row.client_display_recommendation) || text(row.recommended_next_step) || "Needs human review before showing the client.",
    subject_names: list(row.subject_names),
    records_to_show_client: list(row.records_to_show_client),
    records_to_hold_back: list(row.records_to_hold_back),
    record_reviews: objectList(row.record_reviews),
    final_summary: list(row.final_summary),
    overall_run: list(row.overall_run),
    overall_do_not_run: list(row.overall_do_not_run),
    priority_order: list(row.priority_order),
    identity_strength: text(row.identity_strength) || "Needs review",
    identity_match_concerns: list(row.identity_match_concerns),
    record_completeness: list(row.record_completeness),
    possible_reportability_issues: list(row.possible_reportability_issues),
    possible_fcra_concerns: list(row.possible_fcra_concerns),
    county_verification_needed: bool(row.county_verification_needed, true),
    missing_information: list(row.missing_information),
    recommended_next_step: text(row.recommended_next_step) || "Manual reviewer follow-up required.",
    supervisor_review_needed: bool(row.supervisor_review_needed, confidence(row.confidence) < 0.6),
    confidence: confidence(row.confidence),
    sources_used: list(row.sources_used),
    draft_reviewer_note: text(row.draft_reviewer_note) || "AI review completed. Human reviewer must verify before final decision.",
  };
  return applySaffhireReportability(normalized);
}

function fallbackJson(textValue: string): AiReviewOutput {
  return normalizeAiReviewOutput({ review_summary: textValue.slice(0, 900) || "AI review completed, but structured parsing failed.", county_verification_needed: true, missing_information: ["Reviewer should manually verify the AI response."], recommended_next_step: "Manual reviewer follow-up required.", supervisor_review_needed: true, confidence: 0.4, draft_reviewer_note: "Manual review needed because the AI response could not be parsed into the expected format." });
}

export async function runOpenAiReview(input: { caseRecord: any; chunks: any[] }): Promise<AiReviewOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI is not configured.");
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const sourceText = input.chunks.map((chunk, index) => `[Source ${index + 1}] ${chunk.documents?.document_name || "Uploaded document"} v${chunk.document_versions?.version_number || 1}: ${chunk.chunk_text}`).join("\n\n");
  const isClientDisplayReview = input.caseRecord.review_type === "county_search" || input.caseRecord.review_type === "national_crim";
  const isCountySearch = input.caseRecord.review_type === "county_search";
  const isNationalCrim = input.caseRecord.review_type === "national_crim";
  const instruction = isClientDisplayReview
    ? isCountySearch
      ? "You are a SaffHire county result review assistant. The pasted data is already a county-level result. For each record, extract source, name, court, county/state, case, charge, offense date, file date if present, disposition date, and exact status/disposition wording. Set county_search_required to NO unless the county/court is missing or the result is incomplete and needs follow-up. Do not decide final reportability; the app applies SaffHire's default 7-year policy after extraction. Return valid JSON only."
      : "You are a SaffHire National Crim review assistant. Apply this decision tree in order for every record: 1 identity analysis, 2 source analysis, 3 disposition analysis, 4 duplicate case analysis, 5 severity analysis, 6 accuracy gate, 7 county search decision, 8 source confirmation. Identity is first: exact DOB very high weight; exact name high; alias high; address high; SSN/state ID very high; physical description medium; geographic history medium. If identity is weak or conflicting, suppress/do not report and do not recommend county search unless a reviewer has another reason. Source confidence: county court, state court, and DOC are higher confidence; jail, arrest, warrant, and national database hits are lower confidence. If final disposition is missing, open, pending, warrant, jail, or serious charge, usually require county search. Do not recommend duplicate searches when lower court and upper court are the same case; follow the case to the highest court level. High priority includes felonies, violent crimes, sex offenses, domestic violence, drug trafficking, weapons. Low priority includes minor traffic and non-criminal violations. Some sources such as SafeSport, SAM, OIG, sex offender registry, and professional discipline require source agency confirmation instead of county search. Return valid JSON only."
    : "You are an internal SaffHire compliance review assistant. You provide guidance only. You do not make final reportability decisions. Use uploaded documents and federal FCRA reference principles. If support is missing, say more review is needed. Return valid JSON only. Arrays must contain plain strings.";
  const requestedKeys = isClientDisplayReview
    ? isNationalCrim
      ? "review_summary, subject_names, record_reviews, identity_strength, identity_match_concerns, final_summary, overall_run, overall_do_not_run, priority_order, county_verification_needed, recommended_next_step, supervisor_review_needed, confidence, sources_used, draft_reviewer_note. subject_names must list names found. record_reviews must be an array of objects with keys: record_number, record_title, source, name, case_number, court, county_state, charges, statute, offense_date, file_date, disposition_date, status, identity_match_status, matched_identifiers, missing_identifiers, conflicting_identifiers, source_confidence, source_category, disposition_final, duplicate_case_analysis, severity_level, accuracy_gate, source_confirmation_required, county_search_required, why, run, decision, suppress_reason. final_summary must summarize each record in one line."
      : "review_summary, subject_names, record_reviews, identity_strength, identity_match_concerns, final_summary, overall_run, overall_do_not_run, priority_order, county_verification_needed, recommended_next_step, supervisor_review_needed, confidence, sources_used, draft_reviewer_note. subject_names must list the names found in the records. record_reviews must be an array of objects with keys: record_number, record_title, source, name, case_number, court, county_state, charges, statute, offense_date, file_date, disposition_date, status, county_search_required, why, run, decision. final_summary must summarize each record in one line."
    : "review_summary, identity_match_concerns, record_completeness, possible_reportability_issues, possible_fcra_concerns, county_verification_needed, missing_information, recommended_next_step, supervisor_review_needed, confidence, sources_used, draft_reviewer_note";
  const userContent = `Review type: ${input.caseRecord.review_type}\nSubject: ${input.caseRecord.subject_name}\nJurisdiction: ${input.caseRecord.jurisdiction || "Not entered"}\nCounty: ${input.caseRecord.county || ""}\nState: ${input.caseRecord.state || ""}\nSource text:\n${input.caseRecord.raw_record_text}\n\nApproved source excerpts:\n${sourceText || "No uploaded document excerpts were found. Use approved review principles only and clearly say uploaded-source support is missing."}\n\nReturn JSON with keys: ${requestedKeys}.`;
  const body = { model, temperature: 0.1, messages: [ { role: "system", content: instruction }, { role: "user", content: userContent } ], response_format: { type: "json_object" } };
  const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`OpenAI review failed with status ${response.status}`);
  const json = await response.json();
  const content = json.choices?.[0]?.message?.content || "{}";
  try { return normalizeAiReviewOutput(JSON.parse(content)); } catch { return fallbackJson(content); }
}
