import { createClient } from "@supabase/supabase-js";
import { serviceRoleEnvName } from "@/lib/env";

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env[serviceRoleEnvName()];
  if (!url || !key) throw new Error("Supabase server connection is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
