-- הרץ ב-Supabase SQL Editor אם כבר יצרת את הטבלאות בעבר

alter table stores drop constraint if exists stores_store_name_key;

alter table stores add column if not exists username text;

update stores set username = 'ראשי' where username is null;

alter table stores alter column username set default 'ראשי';
alter table stores alter column username set not null;

alter table stores drop constraint if exists stores_store_username_unique;
alter table stores add constraint stores_store_username_unique unique (store_name, username);
