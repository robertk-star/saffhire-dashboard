create table if not exists dashboard_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  role text not null check (role in ('admin', 'reviewer', 'supervisor')),
  access_code_hash text not null,
  is_active boolean not null default true,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dashboard_users_email on dashboard_users(email);
create index if not exists idx_dashboard_users_active on dashboard_users(is_active);

alter table dashboard_users enable row level security;
