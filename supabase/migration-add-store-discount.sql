-- הרץ ב-Supabase SQL Editor (פעם אחת)

alter table stores
  add column if not exists discount_percent numeric(5, 2) not null default 0
  check (discount_percent >= 0 and discount_percent <= 100);
