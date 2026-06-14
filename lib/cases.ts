import { hasDbConfig } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = { open: "Open", needs_supervisor_review: "Supervisor Review", closed: "Closed", archived: "Archived", deleted: "Deleted" };
  return labels[status] || status;
}
export function getStatusBadgeClass(status: string): string {
  if (status === "needs_supervisor_review") return "badge badge-supervisor";
  if (status === "closed") return "badge badge-closed";
  if (status === "archived") return "badge badge-archived";
  if (status === "deleted") return "badge badge-deleted";
  return "badge badge-open";
}
export function getReviewTypeLabel(type: string): string {
  if (type === "criminal_court") return "Criminal Court Review";
  if (type === "national_database") return "National Database Case Review";
  return type;
}
export async function getDashboardCounts() {
  if (!hasDbConfig()) return { open: 0, supervisor: 0, recent: 0, documents: 0, configured: false };
  try {
    const supabase = getSupabaseAdmin();
    const [open, supervisor, recent, documents] = await Promise.all([
      supabase.from("cases").select("id", { count: "exact", head: true }).eq("status", "open").is("deleted_at", null),
      supabase.from("cases").select("id", { count: "exact", head: true }).eq("status", "needs_supervisor_review").is("deleted_at", null),
      supabase.from("cases").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("documents").select("id", { count: "exact", head: true }).is("deleted_at", null),
    ]);
    return { open: open.count ?? 0, supervisor: supervisor.count ?? 0, recent: recent.count ?? 0, documents: documents.count ?? 0, configured: !open.error };
  } catch { return { open: 0, supervisor: 0, recent: 0, documents: 0, configured: false }; }
}
export async function listCases(status?: string) {
  if (!hasDbConfig()) return [];
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("cases").select("*").is("deleted_at", null).order("updated_at", { ascending: false }).limit(100);
    if (status) query = query.eq("status", status);
    const { data } = await query;
    return data || [];
  } catch { return []; }
}
export async function getCaseBundle(id: string) {
  const supabase = getSupabaseAdmin();
  const { data: item, error } = await supabase.from("cases").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  let latestReview: any = null;
  let decisions: any[] = [];
  try {
    const reviews = await supabase.from("ai_reviews").select("*, ai_review_sources(*)").eq("case_id", id).order("created_at", { ascending: false }).limit(1);
    latestReview = reviews.data?.[0] || null;
  } catch {
    latestReview = null;
  }
  try {
    const decisionRows = await supabase.from("review_decisions").select("*").eq("case_id", id).order("created_at", { ascending: false }).limit(20);
    decisions = decisionRows.data || [];
  } catch {
    decisions = [];
  }
  return { item, latestReview, decisions };
}
