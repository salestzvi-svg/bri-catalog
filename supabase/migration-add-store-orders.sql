-- הרץ ב-Supabase SQL Editor
-- שמירת היסטוריית הזמנות מלקוחות (לפני שליחה ל-WhatsApp)

create table if not exists store_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  store_name text not null,
  username text not null,
  items jsonb not null default '[]',
  total_amount numeric(10, 2) not null default 0,
  notes text,
  whatsapp_channel text not null default 'default'
    check (whatsapp_channel in ('default', 'b')),
  created_at timestamptz not null default now()
);

create index if not exists idx_store_orders_store_id on store_orders(store_id);
create index if not exists idx_store_orders_created_at on store_orders(created_at desc);

notify pgrst, 'reload schema';
