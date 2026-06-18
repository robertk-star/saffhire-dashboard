import crypto from "node:crypto";
import { hasDbConfig } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { UserRole, SessionUser } from "@/lib/types";

type AppUser = SessionUser & { loginCode: string };
export type DashboardUserRow = SessionUser & { id: string; is_active: boolean; created_at: string; updated_at: string };

function cleanEmail(value: string): string { return value.trim().toLowerCase(); }
function hashAccessCode(email: string, code: string): string { return crypto.createHmac("sha256", process.env.APP_SESSION_SECRET || "dev-only-change-this-value").update(`${cleanEmail(email)}:${code}`).digest("hex"); }

function parseStaffList(): AppUser[] {
  const raw = process.env.APP_USERS_JSON;
  if (!raw) return [];
  try {
    const rows = JSON.parse(raw) as Array<Record<string, string>>;
    return rows.filter((row) => row.email && row.loginCode && row.role).map((row) => ({ email: cleanEmail(row.email), loginCode: row.loginCode, name: row.name || row.email, role: row.role as UserRole }));
  } catch { return []; }
}

export function getConfiguredUsers(): AppUser[] {
  const users = parseStaffList();
  const adminEmail = process.env.APP_ADMIN_EMAIL;
  const adminCode = process.env.APP_ADMIN_CODE;
  if (adminEmail && adminCode) users.unshift({ email: cleanEmail(adminEmail), loginCode: adminCode, name: "SaffHire Admin", role: "admin" });
  return users;
}

export async function findUser(email: string, loginCode: string): Promise<SessionUser | null> {
  const cleaned = cleanEmail(email);
  if (hasDbConfig()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase.from("dashboard_users").select("email,name,role,access_code_hash,is_active").eq("email", cleaned).eq("is_active", true).maybeSingle();
      if (data?.access_code_hash === hashAccessCode(cleaned, loginCode)) return { email: data.email, name: data.name, role: data.role as UserRole };
    } catch {}
  }
  const found = getConfiguredUsers().find((user) => user.email === cleaned && user.loginCode === loginCode);
  return found ? { email: found.email, name: found.name, role: found.role } : null;
}

export async function listDashboardUsers(): Promise<DashboardUserRow[]> {
  const rows: DashboardUserRow[] = [];
  if (hasDbConfig()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase.from("dashboard_users").select("id,email,name,role,is_active,created_at,updated_at").order("created_at", { ascending: false });
      rows.push(...((data || []) as DashboardUserRow[]));
    } catch {}
  }
  for (const user of getConfiguredUsers()) rows.push({ id: `env-${user.email}`, email: user.email, name: user.name, role: user.role, is_active: true, created_at: "ENV", updated_at: "ENV" });
  return rows;
}

export async function createDashboardUser(input: { email: string; name: string; role: UserRole; accessCode: string; actorEmail: string }) {
  const supabase = getSupabaseAdmin();
  const email = cleanEmail(input.email);
  const { data, error } = await supabase.from("dashboard_users").insert({ email, name: input.name.trim() || email, role: input.role, access_code_hash: hashAccessCode(email, input.accessCode), is_active: true, created_by_email: input.actorEmail }).select("id").single();
  if (error) throw error;
  return data;
}

export async function setDashboardUserActive(id: string, isActive: boolean) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("dashboard_users").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
