-- הרץ ב-Supabase SQL Editor אחרי schema.sql
-- סיסמת מנהל: BRI2024!

update admin_settings
set password_hash = '$2b$10$01s/gw.GkMY5qM7uqsp/0OD9Nfz5Ct2XwWJTKxuGDX42iw9uKqRMu',
    updated_at = now()
where id = 1;
