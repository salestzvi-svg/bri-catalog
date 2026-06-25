-- תוויות בתוך קטגוריה + שיוך מוצרים לתוויות
-- הרץ ב-Supabase SQL Editor

create table if not exists category_labels (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);

create table if not exists product_label_assignments (
  rivhit_item_id int not null,
  label_id uuid not null references category_labels(id) on delete cascade,
  primary key (rivhit_item_id, label_id)
);

create index if not exists idx_category_labels_category on category_labels(category_id);
create index if not exists idx_product_label_assignments_item on product_label_assignments(rivhit_item_id);
create index if not exists idx_product_mappings_category_sort on product_mappings(category_id, sort_order);
