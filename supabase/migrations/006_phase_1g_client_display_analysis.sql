alter table quick_reviews
  add column if not exists address_text text,
  add column if not exists aliases_text text;

create index if not exists idx_quick_reviews_review_type on quick_reviews(review_type);
