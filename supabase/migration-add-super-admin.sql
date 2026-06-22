-- הרץ ב-Supabase SQL Editor (פעם אחת)

create table if not exists super_admin_settings (
  id int primary key default 1 check (id = 1),
  password_hash text not null,
  updated_at timestamptz not null default now()
);

-- סיסמת מנהל ראשי ראשונית: KavanatSuper2024!
insert into super_admin_settings (id, password_hash)
values (1, '$2b$10$24Ks4/brmWsSvUulFXxJ5eiM0wcbXwYytWAJv/G8.1R8WiYFTpwO.')
on conflict (id) do nothing;
