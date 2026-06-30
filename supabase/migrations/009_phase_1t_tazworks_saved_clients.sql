create table if not exists public.tazworks_saved_clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  client_code text,
  client_guid text not null unique,
  notes text,
  is_active boolean not null default true,
  created_by_email text
);

create index if not exists idx_tazworks_saved_clients_active on public.tazworks_saved_clients (is_active);
create index if not exists idx_tazworks_saved_clients_name on public.tazworks_saved_clients (name);
create index if not exists idx_tazworks_saved_clients_code on public.tazworks_saved_clients (client_code);
