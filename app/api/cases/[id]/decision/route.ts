import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await context.params;
  const formData = await request.formData();
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("note") || "").trim();
  const nextStatus = String(formData.get("next_status") || "open");
  if (!decision || !note) return NextResponse.redirect(new URL(`/cases/${id}?error=missing_decision`, request.url), 303);
  const supabase = getSupabaseAdmin();
  const { error: insertError } = await supabase.from("review_decisions").insert({ case_id: id, decision, note, decided_by_email: user.email, decided_by_role: user.role });
  if (insertError) throw insertError;
  const { error: updateError } = await supabase.from("cases").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", id);
  if (updateError) throw updateError;
  return NextResponse.redirect(new URL(`/cases/${id}`, request.url), 303);
}
