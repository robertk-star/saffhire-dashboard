import { NextResponse } from "next/server";
import { getRelevantDocumentChunks } from "@/lib/documents";
import { runOpenAiReview } from "@/lib/openaiReview";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

function backWithError(request: Request, id: string, code: string) {
  return NextResponse.redirect(new URL(`/cases/${id}?ai_error=${code}`, request.url), 303);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  try {
    const { data: caseRecord, error } = await supabase.from("cases").select("*").eq("id", id).maybeSingle();
    if (error || !caseRecord) return backWithError(request, id, "case_not_found");
    const chunks = await getRelevantDocumentChunks(caseRecord.raw_record_text, 10);
    const output = await runOpenAiReview({ caseRecord, chunks });
    const { data: review, error: reviewError } = await supabase.from("ai_reviews").insert({ case_id: id, model_name: process.env.OPENAI_MODEL || "gpt-4.1-mini", review_summary: output.review_summary, structured_output: output, created_by_email: user.email }).select("id").single();
    if (reviewError || !review) return backWithError(request, id, "save_failed");
    if (chunks.length) await supabase.from("ai_review_sources").insert(chunks.map((chunk: any, index: number) => ({ ai_review_id: review.id, document_id: chunk.document_id, document_version_id: chunk.document_version_id, document_chunk_id: chunk.id, source_label: `${index + 1}. ${chunk.documents?.document_name || "Uploaded document"}`, source_excerpt: chunk.chunk_text.slice(0, 900) })));
    const shouldRoute = output.supervisor_review_needed || Number(output.confidence || 0) < 0.6;
    if (shouldRoute) await supabase.from("cases").update({ status: "needs_supervisor_review", updated_at: new Date().toISOString() }).eq("id", id);
    await writeAuditLog({ user, action: "ai_review_run", entityType: "case", entityId: id, metadata: { supervisorReview: shouldRoute, sources: chunks.length, confidence: output.confidence } });
    return NextResponse.redirect(new URL(`/cases/${id}`, request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    await writeAuditLog({ user, action: "ai_review_failed", entityType: "case", entityId: id, metadata: { message } });
    return backWithError(request, id, message.toLowerCase().includes("configured") ? "ai_not_ready" : "review_failed");
  }
}
