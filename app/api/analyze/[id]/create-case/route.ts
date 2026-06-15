import { NextResponse } from "next/server";
import { getQuickAnalysis } from "@/lib/quickAnalyze";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await context.params;
  const row = await getQuickAnalysis(id);
  if (!row) return NextResponse.redirect(new URL(`/analyze/${id}?error=missing`, request.url), 303);
  if (row.case_id) return NextResponse.redirect(new URL(`/cases/${row.case_id}`, request.url), 303);
  const supabase = getSupabaseAdmin();
  const mappedType = row.review_type === "national_crim" ? "national_database" : "criminal_court";
  const { data: caseRow, error } = await supabase.from("cases").insert({ review_type: mappedType, subject_name: row.person_name || "Quick Analysis Subject", dob: null, client_name: null, jurisdiction: null, county: null, state: null, source: row.review_type === "national_crim" ? "National Crim Quick Analyze" : "County Search Quick Analyze", external_reference_number: null, client_rules_status: "not_configured", raw_record_text: row.full_text || row.pasted_text, reviewer_notes: "Created from Client Display Analysis.", created_by_email: user.email }).select("id").single();
  if (error || !caseRow) return NextResponse.redirect(new URL(`/analyze/${id}?error=case`, request.url), 303);
  await supabase.from("case_inputs").insert({ case_id: caseRow.id, input_text: row.full_text || row.pasted_text, created_by_email: user.email });
  const { data: reviewRow } = await supabase.from("ai_reviews").insert({ case_id: caseRow.id, model_name: process.env.OPENAI_MODEL || "gpt-4.1-mini", review_summary: row.result_json?.review_summary || "Client display analysis", structured_output: row.result_json || {}, created_by_email: user.email }).select("id").single();
  if (reviewRow?.id && row.quick_review_sources?.length) {
    await supabase.from("ai_review_sources").insert(row.quick_review_sources.map((source: any) => ({ ai_review_id: reviewRow.id, source_label: source.source_label || "Quick Analyze source", source_excerpt: source.source_excerpt || "" })));
  }
  await supabase.from("quick_reviews").update({ case_id: caseRow.id }).eq("id", id);
  await writeAuditLog({ user, action: "quick_analysis_saved_as_case", entityType: "case", entityId: caseRow.id, metadata: { quickReviewId: id } });
  return NextResponse.redirect(new URL(`/cases/${caseRow.id}`, request.url), 303);
}
