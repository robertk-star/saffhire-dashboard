import pdfParse from "pdf-parse";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const DOCUMENT_BUCKET = "saffhire-documents";
const IMPORTANT_TERMS = ["fcra", "consumer", "report", "conviction", "disposition", "county", "verification", "dismissed", "deferred", "expunged", "sealed", "pending", "adverse", "accuracy", "identifier", "dob", "name", "court"];

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

export async function getDocumentDetail(id: string) {
  const supabase = getSupabaseAdmin();
  const { data: document, error } = await supabase.from("documents").select("*, document_versions(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  let chunks: any[] = [];
  try {
    const { data } = await supabase.from("document_chunks").select("*").eq("document_id", id).order("chunk_index", { ascending: true }).limit(25);
    chunks = data || [];
  } catch { chunks = []; }
  return { document, chunks };
}

function scoreChunk(text: string, queryWords: Set<string>): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const word of queryWords) if (lower.includes(word)) score += IMPORTANT_TERMS.includes(word) ? 5 : 1;
  for (const term of IMPORTANT_TERMS) if (lower.includes(term)) score += 0.25;
  return score;
}

export async function getRelevantDocumentChunks(caseText: string, limit = 10) {
  const words = caseText.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3).slice(0, 180);
  const queryWords = new Set([...words, ...IMPORTANT_TERMS.filter((term) => caseText.toLowerCase().includes(term))]);
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("document_chunks").select("*, documents!inner(document_name, document_type, is_active), document_versions(version_number)").eq("documents.is_active", true).limit(400);
  return (data || []).map((chunk: any) => ({ ...chunk, relevance: scoreChunk(chunk.chunk_text, queryWords) })).filter((chunk: any) => chunk.relevance > 0).sort((a: any, b: any) => b.relevance - a.relevance).slice(0, limit);
}
