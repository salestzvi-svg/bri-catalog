-- איפוס מס סידור לכל המוצרים (0 = ללא מספר, מיון לפי מק"ט אחרי הממוספרים)
-- הרץ ב-Supabase SQL Editor

update product_mappings
set sort_order = 0
where sort_order <> 0;
