create table if not exists tazworks_payloads (
  id uuid primary key default gen_random_uuid(),
  label text,
  payload jsonb not null,
  applicant_name text,
  dob text,
  report_id text,
  record_count integer not null default 0,
  mapped_case_id uuid references cases(id) on delete set null,
  imported_by_email text,
  created_at timestamptz not null default now()
);

create table if not exists tazworks_field_mappings (
  id uuid primary key default gen_random_uuid(),
  saffhire_field text not null,
  tazworks_path text not null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into tazworks_field_mappings (saffhire_field, tazworks_path, notes)
values
  ('applicant_name', 'applicant.name / applicant.fullName / applicant.firstName + applicant.lastName', 'Flexible sample mapping for Phase 1E'),
  ('dob', 'applicant.dob / applicant.dateOfBirth / report.dob', 'Flexible sample mapping for Phase 1E'),
  ('report_id', 'report.id / report.reportId / report.orderId / report.reference', 'Flexible sample mapping for Phase 1E'),
  ('jurisdiction', 'report.jurisdiction / report.county / report.state', 'Flexible sample mapping for Phase 1E'),
  ('records', 'criminal / criminalRecords / records / charges', 'Flexible sample mapping for Phase 1E')
on conflict do nothing;

create index if not exists idx_tazworks_payloads_created on tazworks_payloads(created_at desc);
create index if not exists idx_tazworks_payloads_report_id on tazworks_payloads(report_id);
create index if not exists idx_tazworks_payloads_case on tazworks_payloads(mapped_case_id);

alter table tazworks_payloads enable row level security;
alter table tazworks_field_mappings enable row level security;
