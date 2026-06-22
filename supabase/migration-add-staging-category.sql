-- הרץ ב-Supabase SQL Editor
-- קטגוריית "מוצרים חדשים" — רק למנהלים, לא ללקוחות

alter table categories
  add column if not exists is_staging boolean not null default false;

notify pgrst, 'reload schema';
