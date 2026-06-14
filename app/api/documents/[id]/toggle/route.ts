import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["admin"]);
  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  const { data: doc, error } = await supabase.from("documents").select("is_active").eq("id", id).maybeSingle();
  if (error || !doc) return NextResponse.redirect(new URL("/documents?error=missing", request.url), 303);
  const next = !doc.is_active;
  const { error: updateError } = await supabase.from("documents").update({ is_active: next, updated_at: new Date().toISOString() }).eq("id", id);
  if (updateError) return NextResponse.redirect(new URL("/documents?error=update", request.url), 303);
  await writeAuditLog({ user, action: next ? "document_activated" : "document_deactivated", entityType: "document", entityId: id });
  return NextResponse.redirect(new URL("/documents?toggled=1", request.url), 303);
}
