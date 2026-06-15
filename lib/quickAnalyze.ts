import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export function buildQuickAnalyzeCaseRecord(input: Record<string, string>) {
  const rawText = input.raw_record_text || "";
  const structured = [
    `Review Type: ${input.review_type || "criminal_court"}`,
    `Record Source: ${input.record_source || "Not entered"}`,
    `Subject Name: ${input.subject_name || "Not entered"}`,
    `DOB: ${input.dob || "Not entered"}`,
    `State: ${input.state || "Not entered"}`,
    `County: ${input.county || "Not entered"}`,
    `Case Number: ${input.case_number || "Not entered"}`,
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
    subject_name: input.subject_name || "Quick Analysis Subject",
    dob: input.dob || null,
    jurisdiction: [input.county, input.state].filter(Boolean).join(", ") || null,
    county: input.county || null,
    state: input.state || null,
    source: input.record_source || "Quick Analyze",
    external_reference_number: input.case_number || null,
    raw_record_text: structured,
  };
}

export async function getQuickAnalysis(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("quick_analyses").select("*, quick_analysis_sources(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
