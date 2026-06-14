import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { SessionUser } from "@/lib/users";

export async function writeAuditLog(input: { user: SessionUser | null; action: string; entityType?: string; entityId?: string }) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("audit_logs").insert({
      actor_email: input.user?.email || null,
      actor_role: input.user?.role || null,
      action: input.action,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      metadata: {},
    });
  } catch {
    return;
  }
}
