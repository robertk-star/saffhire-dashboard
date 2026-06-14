import { NextResponse } from "next/server";
import { getRelevantDocumentChunks } from "@/lib/documents";
import { runOpenAiReview } from "@/lib/openaiReview";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  const { data: caseRecord, error } = await supabase.from("cases").select("*").eq("id", id).maybeSingle();
  if (error || !caseRecord) throw error || new Error("Case not found");
  const chunks = await getRelevantDocumentChunks(caseRecord.raw_record_text, 8);
  const output = await runOpenAiReview({ caseRecord, chunks });
  const { data: review, error: reviewError } = await supabase.from("ai_reviews").insert({ case_id: id, model_name: process.env.OPENAI_MODEL || "gpt-4.1-mini", review_summary: output.review_summary, structured_output: output, created_by_email: user.email }).select("id").single();
  if (reviewError) throw reviewError;
  if (chunks.length) await supabase.from("ai_review_sources").insert(chunks.map((chunk: any, index: number) => ({ ai_review_id: review.id, document_id: chunk.document_id, document_version_id: chunk.document_version_id, document_chunk_id: chunk.id, source_label: `${index + 1}. ${chunk.documents?.document_name || "Uploaded document"}`, source_excerpt: chunk.chunk_text.slice(0, 900) })));
  const shouldRoute = output.supervisor_review_needed || Number(output.confidence || 0) < 0.6;
  if (shouldRoute) await supabase.from("cases").update({ status: "needs_supervisor_review", updated_at: new Date().toISOString() }).eq("id", id);
  await writeAuditLog({ user, action: "ai_review_run", entityType: "case", entityId: id, metadata: { supervisorReview: shouldRoute, sources: chunks.length } });
  return NextResponse.redirect(new URL(`/cases/${id}`, request.url), 303);
}
