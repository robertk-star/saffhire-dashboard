import crypto from "node:crypto";
import { hasDbConfig } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { UserRole, SessionUser } from "@/lib/types";

type AppUser = SessionUser & { loginCode: string };
export type DashboardUserRow = SessionUser & { id: string; is_active: boolean; created_at: string; updated_at: string; last_login_at?: string | null; last_failed_login_at?: string | null; failed_login_count?: number | null; access_code_updated_at?: string | null };

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
      const { data } = await supabase.from("dashboard_users").select("id,email,name,role,access_code_hash,is_active,failed_login_count").eq("email", cleaned).eq("is_active", true).maybeSingle();
      if (data?.access_code_hash === hashAccessCode(cleaned, loginCode)) {
        await supabase.from("dashboard_users").update({ last_login_at: new Date().toISOString(), failed_login_count: 0, updated_at: new Date().toISOString() }).eq("id", data.id);
        return { email: data.email, name: data.name, role: data.role as UserRole };
      }
      if (data?.id) await supabase.from("dashboard_users").update({ last_failed_login_at: new Date().toISOString(), failed_login_count: Number(data.failed_login_count || 0) + 1, updated_at: new Date().toISOString() }).eq("id", data.id);
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
      const { data } = await supabase.from("dashboard_users").select("id,email,name,role,is_active,created_at,updated_at,last_login_at,last_failed_login_at,failed_login_count,access_code_updated_at").order("created_at", { ascending: false });
      rows.push(...((data || []) as DashboardUserRow[]));
    } catch {}
  }
  for (const user of getConfiguredUsers()) rows.push({ id: `env-${user.email}`, email: user.email, name: user.name, role: user.role, is_active: true, created_at: "ENV", updated_at: "ENV", last_login_at: null, last_failed_login_at: null, failed_login_count: null, access_code_updated_at: null });
  return rows;
}

export async function createDashboardUser(input: { email: string; name: string; role: UserRole; accessCode: string; actorEmail: string }) {
  const supabase = getSupabaseAdmin();
  const email = cleanEmail(input.email);
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("dashboard_users").insert({ email, name: input.name.trim() || email, role: input.role, access_code_hash: hashAccessCode(email, input.accessCode), is_active: true, created_by_email: input.actorEmail, access_code_updated_at: now }).select("id").single();
  if (error) throw error;
  return data;
}

export async function setDashboardUserActive(id: string, isActive: boolean) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("dashboard_users").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function resetDashboardUserAccessCode(id: string, email: string, accessCode: string) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase.from("dashboard_users").update({ access_code_hash: hashAccessCode(email, accessCode), failed_login_count: 0, access_code_updated_at: now, updated_at: now }).eq("id", id);
  if (error) throw error;
}

export async function updateDashboardUserRole(id: string, role: UserRole) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("dashboard_users").update({ role, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function getDashboardUserById(id: string): Promise<DashboardUserRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("dashboard_users").select("id,email,name,role,is_active,created_at,updated_at,last_login_at,last_failed_login_at,failed_login_count,access_code_updated_at").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as DashboardUserRow | null;
}
