-- הרץ ב-Supabase SQL Editor (פעם אחת, בפרויקט הנכון)

create table if not exists announcements (
  id int primary key default 1 check (id = 1),
  message text not null default '',
  image_url text,
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table announcements add column if not exists image_url text;

insert into announcements (id, message, is_active)
values (1, '', false)
on conflict (id) do nothing;

-- bucket לתמונות מודעות (ציבורי לקריאה)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'announcements',
  'announcements',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- קריאה ציבורית לתמונות
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Announcement images public read'
  ) then
    create policy "Announcement images public read"
    on storage.objects for select
    to public
    using (bucket_id = 'announcements');
  end if;
end $$;
