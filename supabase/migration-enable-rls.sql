-- הרץ ב-Supabase SQL Editor (פעם אחת)
-- סוגר גישה ישירה למסד דרך Publishable/Anon Key; האפליקציה (Service Role) ממשיכה לעבוד.
-- עובד על כל הטבלאות שקיימות בפועל — מדלג אוטומטית על טבלאות שלא נוצרו (למשל category_labels).
-- זהה ל-migration-fix-rls-safe.sql (ללא שאילתות בדיקה בסוף).

do $$
declare
  r record;
  pol record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = r.tablename
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        pol.policyname,
        r.tablename
      );
    end loop;
  end loop;
end $$;

do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'alter table public.%I enable row level security',
      r.tablename
    );
  end loop;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon;
    revoke all on all sequences in schema public from anon;
    revoke all on all functions in schema public from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on all tables in schema public from authenticated;
    revoke all on all sequences in schema public from authenticated;
    revoke all on all functions in schema public from authenticated;
  end if;
end $$;

revoke all on all tables in schema public from public;
revoke all on all sequences in schema public from public;
revoke usage on schema public from anon, authenticated, public;

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, public;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, public;

alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, public;
