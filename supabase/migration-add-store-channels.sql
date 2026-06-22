-- הרץ ב-Supabase SQL Editor (העתק הכל → Run)
-- מעקב אחרי קישור כניסה לכל חנות (קישור 1 / קישור B)

alter table stores add column if not exists signup_channel text;
alter table stores add column if not exists last_login_channel text;

update stores set signup_channel = 'default' where signup_channel is null;
update stores set last_login_channel = 'default' where last_login_channel is null;

alter table stores alter column signup_channel set default 'default';
alter table stores alter column last_login_channel set default 'default';
alter table stores alter column signup_channel set not null;
alter table stores alter column last_login_channel set not null;

do $$
begin
  alter table stores
    add constraint stores_signup_channel_check
    check (signup_channel in ('default', 'b'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table stores
    add constraint stores_last_login_channel_check
    check (last_login_channel in ('default', 'b'));
exception
  when duplicate_object then null;
end $$;

-- רענון cache של Supabase API (חשוב!)
notify pgrst, 'reload schema';
