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
  const nationalInstruction = "You are a SaffHire National Crim identity review assistant. Your main job is NOT to make a final reportability decision. Your main job is to decide whether a national/database record matches the searched person closely enough to order a county search for current, court-level records. First identify the searched person's identity facts: name searched, alias names or name variations, DOB, address history, city/state history, and any other identifiers. Then compare each national record against those facts. Give highest weight to exact DOB plus exact name or alias. Strong weight also goes to address history/geography tied to the same county/state, SSN/state ID/DL if present, and multiple matching identifiers. Name-only matches are weak. Conflicting DOB or impossible geography should usually be suppress/do not run. Partial DOB plus strong name and geography may be possible match. For each record return a clear identity_match_status such as HIGH MATCH, POSSIBLE MATCH, WEAK MATCH, or NON-MATCH. Recommend county_search_required true only when the identity match is high or possible enough that ordering a county search is reasonable. If the record is from a source that needs direct source confirmation instead of county search, set source_confirmation_required true and explain. Do not recommend county search for weak name-only hits, conflicting DOB, minor traffic-only hits, or records that clearly belong to a different person. Final decision should be about RUN COUNTY SEARCH, DO NOT RUN, SOURCE CONFIRMATION, or MANUAL REVIEW. Return valid JSON only.";
  const countyInstruction = "You are a SaffHire County Crim result review assistant. Review county-level records using identity, court level, charge, disposition, duplicate cases, supervision activity, and SaffHire FCRA-aware reporting rules. The goal is to decide whether each county record should be reported to the client. Use the strict 7-year reporting rule where applicable and use exact court wording. Identity is still first: do not report a record if the identity match is weak or conflicting. For every record return report_to_client as Yes, No, or Manual Review and explain why. Return valid JSON only.";
  const instruction = isClientDisplayReview
    ? isCountySearch
      ? countyInstruction
      : nationalInstruction
    : "You are an internal SaffHire compliance review assistant. You provide guidance only. You do not make final reportability decisions. Use uploaded documents and federal FCRA reference principles. If support is missing, say more review is needed. Return valid JSON only. Arrays must contain plain strings.";
  const requestedKeys = isClientDisplayReview
    ? isNationalCrim
      ? "review_summary, subject_names, record_reviews, identity_strength, identity_match_concerns, final_summary, overall_run, overall_do_not_run, priority_order, county_verification_needed, recommended_next_step, supervisor_review_needed, confidence, sources_used, draft_reviewer_note. subject_names must list searched name and aliases found. record_reviews must be an array of objects with keys: record_number, record_title, source, name, alias_or_name_variation, case_number, court, county_state, address_or_geography_match, searched_identity_facts, record_identity_facts, charges, statute, offense_date, file_date, disposition_date, status, identity_match_status, matched_identifiers, missing_identifiers, conflicting_identifiers, source_confidence, source_category, disposition_final, duplicate_case_analysis, severity_level, accuracy_gate, source_confirmation_required, county_search_required, why, run, decision, suppress_reason. final_summary must summarize each record and say Run County Search, Do Not Run, Source Confirmation, or Manual Review."
      : "review_summary, subject_names, record_reviews, identity_strength, identity_match_concerns, final_summary, overall_run, overall_do_not_run, priority_order, county_verification_needed, recommended_next_step, supervisor_review_needed, confidence, sources_used, draft_reviewer_note. subject_names must list names found. record_reviews must be an array of objects with keys: record_number, record_title, source, name, case_number, court, county_state, charges, statute, offense_date, file_date, disposition_date, status, identity_match_status, matched_identifiers, missing_identifiers, conflicting_identifiers, court_level, court_level_analysis, charge_category, criminal_charge, disposition_category, disposition_reportable, duplicate_analysis, supervision_activity, age_scope_status, report_to_client, reportability_reason, reportability_status, show_to_client, hide_reason, manual_review_reason, final_client_decision, why, decision. final_summary must summarize each record in one line and say Report Yes, Report No, or Manual Review."
    : "review_summary, identity_match_concerns, record_completeness, possible_reportability_issues, possible_fcra_concerns, county_verification_needed, missing_information, recommended_next_step, supervisor_review_needed, confidence, sources_used, draft_reviewer_note";
  const subjectIdentityReminder = isNationalCrim ? "\nNational Crim identity reminder: Start by extracting the searched person's name, aliases, DOB, and address history/geography from the source text. Compare every national record to those facts before recommending county search. Do not treat a national hit as final reportability. County search is recommended only when the identity match is strong enough or possible enough to justify pulling current court records.\n" : "";
  const countyReminder = isCountySearch ? "\nCounty Crim reportability reminder: Decide whether each county record should be reported to the client. Return report_to_client as Yes, No, or Manual Review. Include a short reportability_reason. Use identity first, then court level, charge, disposition, pending/final status, duplicate cases, supervision activity, and SaffHire's strict 7-year reporting rule.\n" : "";
  const userContent = `Review type: ${input.caseRecord.review_type}\nSubject: ${input.caseRecord.subject_name}\nJurisdiction: ${input.caseRecord.jurisdiction || "Not entered"}\nCounty: ${input.caseRecord.county || ""}\nState: ${input.caseRecord.state || ""}${subjectIdentityReminder}${countyReminder}\nSource text:\n${input.caseRecord.raw_record_text}\n\nApproved source excerpts:\n${sourceText || "No uploaded document excerpts were found. Use approved review principles only and clearly say uploaded-source support is missing."}\n\nReturn JSON with keys: ${requestedKeys}.`;
  const body = { model, temperature: 0.1, messages: [ { role: "system", content: instruction }, { role: "user", content: userContent } ], response_format: { type: "json_object" } };
  const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`OpenAI review failed with status ${response.status}`);
  const json = await response.json();
  const content = json.choices?.[0]?.message?.content || "{}";
  try { return normalizeAiReviewOutput(JSON.parse(content)); } catch { return fallbackJson(content); }
}
