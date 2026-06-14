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

function fallbackJson(text: string): AiReviewOutput {
  return {
    review_summary: text.slice(0, 900) || "AI review completed, but structured parsing failed.",
    identity_match_concerns: [],
    record_completeness: [],
    possible_reportability_issues: [],
    possible_fcra_concerns: [],
    county_verification_needed: true,
    missing_information: ["Reviewer should manually verify the AI response."],
    recommended_next_step: "Manual reviewer follow-up required.",
    supervisor_review_needed: true,
    confidence: 0.4,
    sources_used: [],
    draft_reviewer_note: "Manual review needed because the AI response could not be parsed into the expected format.",
  };
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
      { role: "system", content: "You are an internal SaffHire compliance review assistant. You provide guidance only. You do not make final reportability decisions. Use uploaded documents and federal FCRA reference principles. If support is missing, say more review is needed. Return valid JSON only." },
      { role: "user", content: `Review type: ${input.caseRecord.review_type}\nSubject: ${input.caseRecord.subject_name}\nJurisdiction: ${input.caseRecord.jurisdiction || "Not entered"}\nCounty: ${input.caseRecord.county || ""}\nState: ${input.caseRecord.state || ""}\nSource text:\n${input.caseRecord.raw_record_text}\n\nApproved source excerpts:\n${sourceText || "No uploaded document excerpts were found. Use federal FCRA reference principles only and clearly say uploaded-source support is missing."}\n\nReturn JSON with keys: review_summary, identity_match_concerns, record_completeness, possible_reportability_issues, possible_fcra_concerns, county_verification_needed, missing_information, recommended_next_step, supervisor_review_needed, confidence, sources_used, draft_reviewer_note.` }
    ],
    response_format: { type: "json_object" }
  };
  const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`OpenAI review failed with status ${response.status}`);
  const json = await response.json();
  const content = json.choices?.[0]?.message?.content || "{}";
  try { return JSON.parse(content) as AiReviewOutput; } catch { return fallbackJson(content); }
}
