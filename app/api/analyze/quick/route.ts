import { NextResponse } from "next/server";
import { getRelevantDocumentChunks } from "@/lib/documents";
import { runOpenAiReview } from "@/lib/openaiReview";
import { buildQuickAnalyzeCaseRecord } from "@/lib/quickAnalyze";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const input: Record<string, string> = {};
  for (const [key, value] of formData.entries()) input[key] = String(value || "").trim();
  if (!input.person_name || !input.pasted_text) return NextResponse.redirect(new URL("/analyze?error=missing", request.url), 303);
  try {
    const caseRecord = buildQuickAnalyzeCaseRecord(input);
    const chunks = await getRelevantDocumentChunks(caseRecord.raw_record_text, 10);
    const output = await runOpenAiReview({ caseRecord, chunks });
    const supabase = getSupabaseAdmin();
    const { data: row, error } = await supabase.from("quick_reviews").insert({ review_type: input.review_type || "criminal_court", source_type: input.source_type || null, person_name: input.person_name || null, dob: input.dob || null, state: input.state || null, county: input.county || null, reference_number: input.reference_number || null, charge: input.charge || null, disposition: input.disposition || null, disposition_date: input.disposition_date || null, sentence: input.sentence || null, pasted_text: input.pasted_text, full_text: caseRecord.raw_record_text, result_json: output, created_by: user.email }).select("id").single();
    if (error || !row) return NextResponse.redirect(new URL("/analyze?error=save", request.url), 303);
    if (chunks.length) await supabase.from("quick_review_sources").insert(chunks.map((chunk: any, index: number) => ({ quick_review_id: row.id, source_label: `${index + 1}. ${chunk.documents?.document_name || "Uploaded document"}`, source_excerpt: chunk.chunk_text.slice(0, 900) })));
    await writeAuditLog({ user, action: "quick_analysis_run", entityType: "quick_review", entityId: row.id, metadata: { sources: chunks.length } });
    return NextResponse.redirect(new URL(`/analyze/${row.id}`, request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/analyze?error=ai", request.url), 303);
  }
}
