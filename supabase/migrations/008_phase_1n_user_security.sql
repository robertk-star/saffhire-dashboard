alter table dashboard_users
  add column if not exists last_login_at timestamptz,
  add column if not exists last_failed_login_at timestamptz,
  add column if not exists failed_login_count integer not null default 0,
  add column if not exists access_code_updated_at timestamptz not null default now();

create index if not exists idx_dashboard_users_last_login on dashboard_users(last_login_at desc);
