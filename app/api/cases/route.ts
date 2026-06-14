import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const subjectName = String(formData.get("subject_name") || "").trim();
  const sourceText = String(formData.get("source_text") || "").trim();
  if (!subjectName || !sourceText) return NextResponse.redirect(new URL("/cases/new?error=missing_required", request.url), 303);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("cases").insert({
    review_type: String(formData.get("review_type") || "court_review"),
    subject_name: subjectName,
    dob: String(formData.get("dob") || "").trim() || null,
    client_name: String(formData.get("client_name") || "").trim() || null,
    jurisdiction: String(formData.get("jurisdiction") || "").trim() || null,
    county: String(formData.get("county") || "").trim() || null,
    state: String(formData.get("state") || "").trim() || null,
    source: String(formData.get("source") || "").trim() || null,
    external_reference_number: String(formData.get("external_reference_number") || "").trim() || null,
    client_rules_status: "not_configured",
    raw_record_text: sourceText,
    reviewer_notes: String(formData.get("reviewer_notes") || "").trim() || null,
    created_by_email: user.email,
  }).select("id").single();

  if (error) throw error;
  await supabase.from("case_inputs").insert({ case_id: data.id, input_text: sourceText, created_by_email: user.email });
  return NextResponse.redirect(new URL(`/cases/${data.id}`, request.url), 303);
}
