import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export function buildQuickAnalyzeCaseRecord(input: Record<string, string>) {
  const rawText = input.pasted_text || "";
  const structured = [
    `Review Type: ${input.review_type || "criminal_court"}`,
    `Record Source: ${input.source_type || "Not entered"}`,
    `Subject Name: ${input.person_name || "Not entered"}`,
    `DOB: ${input.dob || "Not entered"}`,
    `State: ${input.state || "Not entered"}`,
    `County: ${input.county || "Not entered"}`,
    `Reference Number: ${input.reference_number || "Not entered"}`,
    `Charge: ${input.charge || "Not entered"}`,
    `Disposition: ${input.disposition || "Not entered"}`,
    `Disposition Date: ${input.disposition_date || "Not entered"}`,
    `Sentence: ${input.sentence || "Not entered"}`,
    "",
    "Raw pasted text:",
    rawText,
  ].join("\n");
  return {
    review_type: input.review_type || "criminal_court",
    subject_name: input.person_name || "Quick Analysis Subject",
    dob: input.dob || null,
    jurisdiction: [input.county, input.state].filter(Boolean).join(", ") || null,
    county: input.county || null,
    state: input.state || null,
    source: input.source_type || "Quick Analyze",
    external_reference_number: input.reference_number || null,
    raw_record_text: structured,
  };
}

export async function getQuickAnalysis(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("quick_reviews").select("*, quick_review_sources(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
