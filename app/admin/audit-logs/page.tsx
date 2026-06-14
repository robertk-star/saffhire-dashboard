import { AppHeader } from "@/components/AppHeader";
import { hasDbConfig } from "@/lib/env";
import { requireUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export default async function AuditLogsPage() {
  const user = await requireUser(["admin"]);
  let logs: any[] = [];
  if (hasDbConfig()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
      logs = data || [];
    } catch { logs = []; }
  }
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>Audit Logs</h1><div className="card table-wrap"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th></tr></thead><tbody>{logs.length ? logs.map((log) => <tr key={log.id}><td>{new Date(log.created_at).toLocaleString()}</td><td>{log.actor_email || "System"}</td><td>{log.action}</td><td>{[log.entity_type, log.entity_id].filter(Boolean).join(" / ")}</td></tr>) : <tr><td colSpan={4}>No audit logs found yet.</td></tr>}</tbody></table></div></main></>;
}
