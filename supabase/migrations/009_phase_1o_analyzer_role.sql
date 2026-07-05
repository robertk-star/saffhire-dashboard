alter table dashboard_users
  drop constraint if exists dashboard_users_role_check;

alter table dashboard_users
  add constraint dashboard_users_role_check
  check (role in ('admin', 'reviewer', 'supervisor', 'analyzer'));
