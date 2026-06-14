insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('saffhire-documents', 'saffhire-documents', false, 52428800, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 52428800, allowed_mime_types = array['application/pdf'];

create index if not exists idx_documents_type_active on documents(document_type, is_active);
create index if not exists idx_document_chunks_text_search on document_chunks using gin (to_tsvector('english', chunk_text));
create index if not exists idx_ai_reviews_case_created on ai_reviews(case_id, created_at desc);
create index if not exists idx_ai_sources_review on ai_review_sources(ai_review_id);
