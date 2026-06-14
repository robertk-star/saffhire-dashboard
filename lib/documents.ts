import pdfParse from "pdf-parse";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const DOCUMENT_BUCKET = "saffhire-documents";

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parsed = await pdfParse(buffer);
  return (parsed.text || "").replace(/\s+\n/g, "\n").trim();
}

export function chunkText(text: string, size = 1600, overlap = 180): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let index = 0;
  while (index < clean.length) {
    chunks.push(clean.slice(index, index + size));
    index += size - overlap;
  }
  return chunks;
}

export async function listDocuments() {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from("documents").select("*, document_versions(*)").is("deleted_at", null).order("created_at", { ascending: false });
    return data || [];
  } catch { return []; }
}

function scoreChunk(text: string, queryWords: Set<string>): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const word of queryWords) if (lower.includes(word)) score += 1;
  return score;
}

export async function getRelevantDocumentChunks(caseText: string, limit = 8) {
  const words = caseText.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 4).slice(0, 120);
  const queryWords = new Set(words);
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("document_chunks").select("*, documents(document_name, document_type), document_versions(version_number)").limit(250);
  return (data || []).map((chunk: any) => ({ ...chunk, relevance: scoreChunk(chunk.chunk_text, queryWords) })).sort((a: any, b: any) => b.relevance - a.relevance).slice(0, limit);
}
