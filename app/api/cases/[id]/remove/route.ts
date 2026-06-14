import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["admin"]);
  const { id } = await context.params;
  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("cases").update({ status: "deleted", deleted_at: now, updated_at: now }).eq("id", id);
  if (error) throw error;
  await writeAuditLog({ user, action: "case_soft_removed", entityType: "case", entityId: id });
  return NextResponse.redirect(new URL("/cases", request.url), 303);
}
