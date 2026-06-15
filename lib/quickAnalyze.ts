import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export function buildQuickAnalyzeCaseRecord(input: Record<string, string>) {
  const rawText = input.pasted_text || "";
  const structured = [
    `Search Type: ${input.review_type || "county_search"}`,
    `Name: ${input.person_name || "Not entered"}`,
    "",
    "Aliases:",
    input.aliases_text || "Not entered",
    "",
    "Address Information:",
    input.address_text || "Not entered",
    "",
    "Raw Data:",
    rawText,
  ].join("\n");
  return {
    review_type: input.review_type || "county_search",
    subject_name: input.person_name || "Quick Analysis Subject",
    dob: null,
    jurisdiction: null,
    county: null,
    state: null,
    source: input.review_type === "national_crim" ? "National Crim Quick Analyze" : "County Search Quick Analyze",
    external_reference_number: null,
    raw_record_text: structured,
  };
}

export async function getQuickAnalysis(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("quick_reviews").select("*, quick_review_sources(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
