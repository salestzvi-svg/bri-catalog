# הוראות התקנה — קטלוג כוונת הלב

## שלב 1: הרצת SQL ב-Supabase

1. היכנס ל-https://supabase.com
2. פתח את הפרויקט `catalog-app`
3. בתפריט השמאלי לחץ **SQL Editor**
4. לחץ **New query**
5. פתח את הקובץ `supabase/schema.sql` מהפרויקט
6. העתק את כל התוכן → הדבק ב-SQL Editor
7. לחץ **Run**

## שלב 2: הרצה מקומית (לבדיקה)

```bash
cd ~/Projects/catalog-app
npm run dev
```

פתח בדפדפן: http://localhost:3000

## שלב 3: כניסות

- **מנהל:** `/admin/login` — סיסמה: `Kavanat2024!`
- **לקוח:** `/login` — הרשמה עם שם חנות + סיסמה

## שלב 4: הגדרת קטלוג

1. התחבר כמנהל
2. הוסף קטגוריות (למשל: משקאות, חטיפים)
3. עבור ל"מוצרים" → שייך כל מוצר לקטגוריה → שמור
4. התחבר כלקוח → בדוק שהמוצרים מופיעים
5. הוסף לעגלה → "סיים הזמנה ב-WhatsApp"

## Rivhit

- כרגע: חשבון Demo (חינמי)
- בייצור: החלף `RIVHIT_API_TOKEN` ב-`.env.local` בטוקן האמיתי מ-Rivhit

## WhatsApp

ההזמנה נשלחת ל: 0555662240
בפורמט: מק"ט + כמות בלבד

## שלב 5: פרסום לאינטרנט (Vercel) — קישור ללקוחות

**חשוב:** כתובת כמו `kavanat-catalog.vercel.app` לא קיימת עד שמפרסמים. אם מקבלים `404 DEPLOYMENT_NOT_FOUND` — האפליקציה עדיין לא פורסמה.

### צעדים (פעם אחת)

1. היכנס ל-https://vercel.com והתחבר (עם GitHub)
2. לחץ **Add New → Project**
3. בחר את הריפו **catalog-app** → **Import**
4. לפני Deploy — לחץ **Environment Variables** והוסף:

| שם | ערך |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | מ-Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | מ-Supabase (Publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | מ-Supabase (Secret key) |
| `RIVHIT_API_TOKEN` | הטוקן מ-Rivhit |
| `RIVHIT_API_URL` | `https://api.rivhit.co.il/online/RivhitOnlineAPI.svc` |
| `NEXT_PUBLIC_APP_NAME` | `קטלוג כוונת הלב` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `972555662240` |
| `SESSION_SECRET` | מחרוזת אקראית ארוכה (למשל 32 תווים) |

5. לחץ **Deploy** — המתן 2–3 דקות
6. Vercel ייתן כתובת אמיתית, למשל: `https://catalog-app-xxxxx.vercel.app`
7. שלח ללקוחות: `https://catalog-app-xxxxx.vercel.app/login`

> אפשר לשנות שם ב-Settings → Domains, רק אם השם פנוי ב-Vercel.
