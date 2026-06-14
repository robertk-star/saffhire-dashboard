create index if not exists idx_cases_review_type_status on cases(review_type, status);
create index if not exists idx_cases_client_name on cases(client_name);
create index if not exists idx_cases_external_reference on cases(external_reference_number);
create index if not exists idx_cases_dob on cases(dob);
create index if not exists idx_cases_source on cases(source);
