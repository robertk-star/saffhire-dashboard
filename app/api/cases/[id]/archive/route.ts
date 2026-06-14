import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await context.params;
  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("cases").update({ status: "archived", archived_at: now, updated_at: now }).eq("id", id);
  if (error) throw error;
  return NextResponse.redirect(new URL(`/cases/${id}`, request.url), 303);
}
