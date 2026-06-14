create extension if not exists "pgcrypto";

create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  review_type text not null,
  status text not null default 'open',
  subject_name text not null,
  dob text,
  client_name text,
  jurisdiction text,
  county text,
  state text,
  source text,
  external_reference_number text,
  client_rules_status text not null default 'not_configured',
  raw_record_text text not null,
  reviewer_notes text,
  created_by_email text,
  assigned_to_email text,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists case_inputs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  input_type text not null default 'raw_paste',
  input_text text not null,
  created_by_email text,
  created_at timestamptz not null default now()
);

create table if not exists review_decisions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  decision text not null,
  note text not null,
  decided_by_email text,
  decided_by_role text,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  document_name text not null,
  document_type text not null default 'other',
  is_active boolean not null default true,
  uploaded_by_email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  version_number integer not null,
  storage_path text,
  original_filename text,
  extracted_text text,
  uploaded_by_email text,
  created_at timestamptz not null default now()
);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  document_version_id uuid not null references document_versions(id) on delete cascade,
  chunk_index integer not null,
  chunk_text text not null,
  source_page integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ai_reviews (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  model_name text,
  review_summary text,
  structured_output jsonb not null default '{}'::jsonb,
  created_by_email text,
  created_at timestamptz not null default now()
);

create table if not exists ai_review_sources (
  id uuid primary key default gen_random_uuid(),
  ai_review_id uuid not null references ai_reviews(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  document_version_id uuid references document_versions(id) on delete set null,
  document_chunk_id uuid references document_chunks(id) on delete set null,
  source_label text,
  source_excerpt text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_cases_status_updated on cases(status, updated_at desc);
create index if not exists idx_cases_subject_name on cases(subject_name);
create index if not exists idx_cases_deleted_at on cases(deleted_at);
create index if not exists idx_review_decisions_case_id on review_decisions(case_id);
create index if not exists idx_audit_logs_created_at on audit_logs(created_at desc);
create index if not exists idx_document_chunks_document_version on document_chunks(document_version_id);

alter table cases enable row level security;
alter table case_inputs enable row level security;
alter table review_decisions enable row level security;
alter table documents enable row level security;
alter table document_versions enable row level security;
alter table document_chunks enable row level security;
alter table ai_reviews enable row level security;
alter table ai_review_sources enable row level security;
alter table audit_logs enable row level security;
