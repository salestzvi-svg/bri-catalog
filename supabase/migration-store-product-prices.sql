-- הרץ ב-Supabase SQL Editor (פעם אחת)

create table if not exists store_product_prices (
  store_id uuid not null references stores(id) on delete cascade,
  rivhit_item_id integer not null,
  custom_price numeric(10, 2) not null check (custom_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, rivhit_item_id)
);

create index if not exists store_product_prices_store_id_idx
  on store_product_prices (store_id);

alter table stores
  add column if not exists discount_applies_to_custom_prices boolean not null default false;

alter table store_product_prices enable row level security;
revoke all on table store_product_prices from anon, authenticated, public;
