-- הרץ ב-Supabase SQL Editor (פעם אחת)

create table if not exists agent_manager_settings (
  id int primary key default 1 check (id = 1),
  password_hash text not null,
  updated_at timestamptz not null default now()
);

-- סיסמת מנהל סוכנים ראשונית: KavanatAgents2024!
insert into agent_manager_settings (id, password_hash)
values (1, '$2b$10$XUPePkwv3EkgSPD7/GRPpeqJSKi04la/ZLQO5He10Rwh/Rfw8PbtW')
on conflict (id) do nothing;

create table if not exists agent_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  rivhit_agent_id int not null,
  rivhit_agent_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_accounts_username on agent_accounts(username);
create index if not exists idx_agent_accounts_rivhit on agent_accounts(rivhit_agent_id);
