import { NextResponse } from "next/server";
import { DOCUMENT_BUCKET, chunkText, extractPdfText, sanitizeFileName } from "@/lib/documents";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const user = await requireUser(["admin"]);
  const formData = await request.formData();
  const file = formData.get("pdf");
  const documentName = String(formData.get("document_name") || "").trim();
  const documentType = String(formData.get("document_type") || "other");
  const notes = String(formData.get("notes") || "").trim() || null;
  if (!(file instanceof File) || !documentName) return NextResponse.redirect(new URL("/documents?error=missing", request.url), 303);
  const buffer = Buffer.from(await file.arrayBuffer());
  const extractedText = await extractPdfText(buffer);
  if (!extractedText) return NextResponse.redirect(new URL("/documents?error=no_text", request.url), 303);
  const supabase = getSupabaseAdmin();
  const { data: doc, error: docError } = await supabase.from("documents").insert({ document_name: documentName, document_type: documentType, notes, uploaded_by_email: user.email }).select("id").single();
  if (docError) throw docError;
  const storagePath = `${doc.id}/${Date.now()}-${sanitizeFileName(file.name || "document.pdf")}`;
  await supabase.storage.from(DOCUMENT_BUCKET).upload(storagePath, buffer, { contentType: "application/pdf", upsert: false });
  const { data: version, error: versionError } = await supabase.from("document_versions").insert({ document_id: doc.id, version_number: 1, storage_path: storagePath, original_filename: file.name || "document.pdf", extracted_text: extractedText, uploaded_by_email: user.email }).select("id").single();
  if (versionError) throw versionError;
  const chunks = chunkText(extractedText).map((chunk, index) => ({ document_id: doc.id, document_version_id: version.id, chunk_index: index, chunk_text: chunk }));
  if (chunks.length) await supabase.from("document_chunks").insert(chunks);
  await writeAuditLog({ user, action: "document_uploaded", entityType: "document", entityId: doc.id, metadata: { documentType, chunks: chunks.length } });
  return NextResponse.redirect(new URL("/documents?uploaded=1", request.url), 303);
}
