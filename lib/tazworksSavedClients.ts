import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type TazworksSavedClient = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  client_code: string | null;
  client_guid: string;
  notes: string | null;
  is_active: boolean;
  created_by_email: string | null;
};

function cleanGuid(value: string) {
  return value.trim();
}

export async function listTazworksSavedClients(includeInactive = false, search = ""): Promise<TazworksSavedClient[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("tazworks_saved_clients").select("*").order("name", { ascending: true });
  if (!includeInactive) query = query.eq("is_active", true);
  const term = search.trim();
  if (term) query = query.or(`name.ilike.%${term}%,client_code.ilike.%${term}%,client_guid.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as TazworksSavedClient[];
}

export async function getTazworksSavedClient(id: string): Promise<TazworksSavedClient | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("tazworks_saved_clients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as TazworksSavedClient | null;
}

export async function createTazworksSavedClient(input: { name: string; clientCode?: string; clientGuid: string; notes?: string; actorEmail: string }) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("tazworks_saved_clients").insert({
    name: input.name.trim(),
    client_code: input.clientCode?.trim() || null,
    client_guid: cleanGuid(input.clientGuid),
    notes: input.notes?.trim() || null,
    is_active: true,
    created_by_email: input.actorEmail,
    updated_at: now,
  }).select("id").single();
  if (error) throw error;
  return data;
}

export async function updateTazworksSavedClient(input: { id: string; name: string; clientCode?: string; clientGuid: string; notes?: string }) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("tazworks_saved_clients").update({
    name: input.name.trim(),
    client_code: input.clientCode?.trim() || null,
    client_guid: cleanGuid(input.clientGuid),
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq("id", input.id);
  if (error) throw error;
}

export async function setTazworksSavedClientActive(id: string, isActive: boolean) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("tazworks_saved_clients").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
