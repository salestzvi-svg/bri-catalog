-- הרץ ב-Supabase SQL Editor (העתק הכל → Run)
-- מעקב: מאיזה קישור כל חנות נכנסה

create table if not exists store_link_tracking (
  store_id uuid primary key references stores(id) on delete cascade,
  signup_channel text not null default 'default'
    check (signup_channel in ('default', 'b')),
  last_login_channel text not null default 'default'
    check (last_login_channel in ('default', 'b')),
  updated_at timestamptz not null default now()
);

insert into store_link_tracking (store_id, signup_channel, last_login_channel)
select id, 'default', 'default'
from stores
on conflict (store_id) do nothing;

notify pgrst, 'reload schema';

-- אחרי ההרצה: לקוחות שכבר נכנסו דרך קישור 2 צריכים להתחבר שוב
-- (יציאה → /b/login) כדי שהתיוג יתעדכן ל"קישור 2".
