-- שמות נסתרים לחיפוש בלבד (לא מוצגים ללקוח)
-- הרץ ב-Supabase SQL Editor

alter table product_overrides
  add column if not exists search_aliases text;
