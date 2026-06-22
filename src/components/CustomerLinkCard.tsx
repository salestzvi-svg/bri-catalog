"use client";

import { useEffect, useState } from "react";

interface CustomerLinkData {
  publicLink: string | null;
  publicLinkB: string | null;
  localLink: string | null;
  isDeployed: boolean;
}

function LinkRow({
  label,
  url,
  hint,
}: {
  label: string;
  url: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("העתק את הקישור:", url);
    }
  }

  function shareWhatsApp() {
    const text = `קטלוג כוונת הלב — היכנס להזמנה:\n${url}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
      <p className="text-sm font-semibold text-emerald-900">{label}</p>
      {hint && <p className="mt-1 text-xs text-gray-600">{hint}</p>}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          dir="ltr"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          onFocus={(e) => e.target.select()}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white sm:flex-none"
          >
            {copied ? "הועתק!" : "העתק"}
          </button>
          <button
            type="button"
            onClick={shareWhatsApp}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white sm:flex-none"
          >
            שלח ב-WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerLinkCard() {
  const [data, setData] = useState<CustomerLinkData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/admin/customer-link");
        const json = await response.json();
        if (!response.ok) {
          setError(json.error || "שגיאה בטעינת הקישור");
          return;
        }
        setData(json);
      } catch {
        setError("שגיאת רשת");
      }
    }

    load();
  }, []);

  const primaryLink = data?.publicLink ?? data?.localLink;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">קישור ללקוחות</h2>
      <p className="mt-2 text-sm text-gray-600">
        שלח קישור זה ללקוחות — הם יפתחו אותו בטלפון, יתחברו עם שם חנות וסיסמה,
        ויוכלו להזמין.
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!data && !error && (
        <p className="mt-4 text-sm text-gray-500">טוען קישור...</p>
      )}

      {data && (
        <div className="mt-4 space-y-3">
          {data.publicLink ? (
            <LinkRow
              label="קישור לאינטרנט (לשליחה ללקוחות)"
              url={data.publicLink}
              hint="הזמנות נשלחות למספר WhatsApp הראשי"
            />
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">עדיין אין קישור ציבורי</p>
              <p className="mt-1">
                כדי שלקוחות יוכלו להיכנס מהטלפון מכל מקום — צריך לפרסם את
                האפליקציה ב-Vercel (vercel.com). בינתיים השתמש בקישור הרשת
                המקומית למטה (רק כשהטלפון והמחשב על אותו WiFi). אל תשתמש
                בכתובת דוגמה שלא פרסמת — היא תחזיר שגיאה 404.
              </p>
            </div>
          )}

          {data.publicLinkB && (
            <LinkRow
              label="קישור B — WhatsApp שני"
              url={data.publicLinkB}
              hint="אותו קטלוג, הזמנות נשלחות למספר WhatsApp אחר"
            />
          )}

          {data.localLink && !data.isDeployed && (
            <LinkRow
              label={
                data.publicLink
                  ? "קישור לבדיקה ברשת הביתית"
                  : "קישור לבדיקה מהטלפון (WiFi)"
              }
              url={data.localLink}
              hint="הטלפון והמחשב חייבים להיות על אותה רשת WiFi"
            />
          )}

          {!data.localLink && !data.publicLink && (
            <p className="text-sm text-gray-600">
              לא נמצאה כתובת. ודא שהשרת רץ (`npm run dev`).
            </p>
          )}

          {primaryLink && (
            <p className="text-xs text-gray-500">
              הלקוח נכנס → מזין שם חנות + סיסמה → רואה קטגוריות → בוחר מוצרים →
              שולח ב-WhatsApp.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
