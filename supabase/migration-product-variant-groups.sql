-- משפחות מוצר (אותו ספר בשפות שונות)
-- הרץ ב-Supabase SQL Editor

alter table product_mappings
  add column if not exists variant_group_id uuid;

create index if not exists idx_product_mappings_variant_group
  on product_mappings(variant_group_id)
  where variant_group_id is not null;
