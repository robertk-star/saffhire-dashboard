export type AiReviewOutput = {
  review_summary: string;
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

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join("; ");
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([key, val]) => `${key}: ${text(val)}`).join("; ");
  return String(value);
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  const one = text(value);
  return one ? [one] : [];
}

function bool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["yes", "true", "needed", "required"].includes(value.toLowerCase());
  return fallback;
}

function confidence(value: unknown): number {
  if (typeof value === "number") return Math.max(0, Math.min(1, value > 1 ? value / 100 : value));
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed)) : 0.5;
}

export function normalizeAiReviewOutput(raw: unknown): AiReviewOutput {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    review_summary: text(row.review_summary) || "AI review completed, but no summary was provided.",
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
}

function fallbackJson(textValue: string): AiReviewOutput {
  return normalizeAiReviewOutput({
    review_summary: textValue.slice(0, 900) || "AI review completed, but structured parsing failed.",
    county_verification_needed: true,
    missing_information: ["Reviewer should manually verify the AI response."],
    recommended_next_step: "Manual reviewer follow-up required.",
    supervisor_review_needed: true,
    confidence: 0.4,
    draft_reviewer_note: "Manual review needed because the AI response could not be parsed into the expected format.",
  });
}

export async function runOpenAiReview(input: { caseRecord: any; chunks: any[] }): Promise<AiReviewOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI is not configured.");
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const sourceText = input.chunks.map((chunk, index) => `[Source ${index + 1}] ${chunk.documents?.document_name || "Uploaded document"} v${chunk.document_versions?.version_number || 1}: ${chunk.chunk_text}`).join("\n\n");
  const body = {
    model,
    temperature: 0.1,
    messages: [
      { role: "system", content: "You are an internal SaffHire compliance review assistant. You provide guidance only. You do not make final reportability decisions. Use uploaded documents and federal FCRA reference principles. If support is missing, say more review is needed. Return valid JSON only. Keep each array field as an array of plain strings, never objects." },
      { role: "user", content: `Review type: ${input.caseRecord.review_type}\nSubject: ${input.caseRecord.subject_name}\nJurisdiction: ${input.caseRecord.jurisdiction || "Not entered"}\nCounty: ${input.caseRecord.county || ""}\nState: ${input.caseRecord.state || ""}\nSource text:\n${input.caseRecord.raw_record_text}\n\nApproved source excerpts:\n${sourceText || "No uploaded document excerpts were found. Use federal FCRA reference principles only and clearly say uploaded-source support is missing."}\n\nReturn JSON with keys: review_summary, identity_match_concerns, record_completeness, possible_reportability_issues, possible_fcra_concerns, county_verification_needed, missing_information, recommended_next_step, supervisor_review_needed, confidence, sources_used, draft_reviewer_note.` }
    ],
    response_format: { type: "json_object" }
  };
  const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`OpenAI review failed with status ${response.status}`);
  const json = await response.json();
  const content = json.choices?.[0]?.message?.content || "{}";
  try { return normalizeAiReviewOutput(JSON.parse(content)); } catch { return fallbackJson(content); }
}
