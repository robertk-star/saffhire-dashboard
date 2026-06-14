import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
const allowed = new Set(["open", "needs_supervisor_review", "closed"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await context.params;
  const formData = await request.formData();
  const status = String(formData.get("status") || "");
  if (!allowed.has(status)) return NextResponse.redirect(new URL(`/cases/${id}`, request.url), 303);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("cases").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  await writeAuditLog({ user, action: "case_status_updated", entityType: "case", entityId: id, metadata: { status } });
  return NextResponse.redirect(new URL(`/cases/${id}`, request.url), 303);
}
