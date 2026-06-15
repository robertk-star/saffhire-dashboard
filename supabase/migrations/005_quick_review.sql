create table if not exists quick_reviews (
  id uuid primary key default gen_random_uuid(),
  review_type text not null default 'criminal_court',
  source_type text,
  person_name text,
  dob text,
  state text,
  county text,
  reference_number text,
  charge text,
  disposition text,
  disposition_date text,
  sentence text,
  pasted_text text not null,
  full_text text not null,
  result_json jsonb not null default '{}'::jsonb,
  case_id uuid,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists quick_review_sources (
  id uuid primary key default gen_random_uuid(),
  quick_review_id uuid not null,
  source_label text,
  source_excerpt text,
  created_at timestamptz not null default now()
);

create index if not exists idx_quick_reviews_created on quick_reviews(created_at desc);
create index if not exists idx_quick_review_sources_id on quick_review_sources(quick_review_id);
