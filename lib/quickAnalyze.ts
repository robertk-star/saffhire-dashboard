import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export function buildQuickAnalyzeCaseRecord(input: Record<string, string>) {
  const rawText = input.pasted_text || "";
  const structured = [
    `Search Type: ${input.review_type || "county_search"}`,
    `Client: ${input.client_name || input.clientName || "Not entered"}`,
    `Client Code: ${input.client_code || input.clientCode || "Not entered"}`,
    `File Number: ${input.file_number || input.fileNumber || "Not entered"}`,
    `Order GUID: ${input.order_guid || input.orderGuid || "Not entered"}`,
    `Search GUID: ${input.search_guid || input.searchGuid || "Not entered"}`,
    `Name: ${input.person_name || "Not entered"}`,
    `DOB: ${input.dob || "Not entered"}`,
    "",
    "Alias Information:",
    input.aliases_text || "Not entered",
    "",
    "Address Information:",
    input.address_text || "Not entered",
    "",
    "Vendor Records:",
    rawText,
  ].join("\n");
  return {
    review_type: input.review_type || "county_search",
    subject_name: input.person_name || "Quick Analysis Subject",
    dob: input.dob || null,
    jurisdiction: input.jurisdiction || null,
    county: input.county || null,
    state: input.state || null,
    source: input.review_type === "national_crim" ? "National Database Alias Manual Analysis" : "County Search Quick Analyze",
    external_reference_number: input.reference_number || input.search_guid || input.searchGuid || null,
    raw_record_text: structured,
  };
}

export async function getQuickAnalysis(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("quick_reviews").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  let sources: any[] = [];
  try {
    const sourceRows = await supabase.from("quick_review_sources").select("*").eq("quick_review_id", id).order("created_at", { ascending: true });
    sources = sourceRows.data || [];
  } catch {
    sources = [];
  }
  return { ...data, quick_review_sources: sources };
}
