import { hasDbConfig } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type CaseFilters = { status?: string; reviewType?: string; q?: string; limit?: number };

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
function matchesSearch(item: any, q?: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  const fields = [item.subject_name, item.dob, item.client_name, item.jurisdiction, item.county, item.state, item.source, item.external_reference_number, item.raw_record_text];
  return fields.some((value) => String(value || "").toLowerCase().includes(needle));
}
export async function getDashboardCounts() {
  const empty = { open: 0, supervisor: 0, recent: 0, documents: 0, criminalCourt: 0, nationalDatabase: 0, closed: 0, configured: false };
  if (!hasDbConfig()) return empty;
  try {
    const supabase = getSupabaseAdmin();
    const [open, supervisor, recent, documents, criminalCourt, nationalDatabase, closed] = await Promise.all([
      supabase.from("cases").select("id", { count: "exact", head: true }).eq("status", "open").is("deleted_at", null),
      supabase.from("cases").select("id", { count: "exact", head: true }).eq("status", "needs_supervisor_review").is("deleted_at", null),
      supabase.from("cases").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("documents").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("cases").select("id", { count: "exact", head: true }).eq("review_type", "criminal_court").is("deleted_at", null),
      supabase.from("cases").select("id", { count: "exact", head: true }).eq("review_type", "national_database").is("deleted_at", null),
      supabase.from("cases").select("id", { count: "exact", head: true }).eq("status", "closed").is("deleted_at", null),
    ]);
    return { open: open.count ?? 0, supervisor: supervisor.count ?? 0, recent: recent.count ?? 0, documents: documents.count ?? 0, criminalCourt: criminalCourt.count ?? 0, nationalDatabase: nationalDatabase.count ?? 0, closed: closed.count ?? 0, configured: !open.error };
  } catch { return empty; }
}
export async function listCases(filters: CaseFilters = {}) {
  if (!hasDbConfig()) return [];
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("cases").select("*").is("deleted_at", null).order("updated_at", { ascending: false }).limit(filters.limit || 150);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.reviewType) query = query.eq("review_type", filters.reviewType);
    const { data } = await query;
    return (data || []).filter((item) => matchesSearch(item, filters.q));
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
  } catch { latestReview = null; }
  try {
    const decisionRows = await supabase.from("review_decisions").select("*").eq("case_id", id).order("created_at", { ascending: false }).limit(20);
    decisions = decisionRows.data || [];
  } catch { decisions = []; }
  return { item, latestReview, decisions };
}
