# פרויקט BRI — התחלה

העתק מ-catalog-app. כוונת הלב לא נגעה.

## פתיחה ב-Cursor

1. File → New Window
2. File → Open Folder → `/Users/a1/Projects/bri-catalog`

## מה לכתוב לי בצ'אט החדש

העתק והדבק:

```
עובדים על bri-catalog בנתיב /Users/a1/Projects/bri-catalog
זה קטלוג BRI — פרויקט נפרד מ-catalog-app
```

ואז תן:
- שם לתצוגה (למשל: קטלוג BRI)
- מספרי וואטסאפ
- מיילים להזמנות
- טוקן Rivhit של BRI (אחרי שתיצור Supabase)

## לפני שעולים לאינטרנט — אתה עושה

1. Supabase חדש → הרץ `supabase/schema.sql` + `migration-add-announcements.sql` + `migration-add-product-images.sql`
2. צור `.env.local` (העתק מ-catalog-app והחלף מפתחות)
3. `npm install` ואז `npm run dev`
4. GitHub ריפו חדש `bri-catalog` → push
5. Vercel פרויקט חדש מחובר ל-bri-catalog

סיסמת מנהל ראשונית: `Kavanat2024!`
