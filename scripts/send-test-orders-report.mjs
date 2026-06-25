#!/usr/bin/env node
/**
 * בדיקת שליחת דוח הזמנות:
 * npx vercel env pull .env.production.local --environment=production
 * node scripts/send-test-orders-report.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq);
    let v = trimmed.slice(eq + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

loadEnvFile(".env.production.local");
loadEnvFile(".env.local");

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;

if (!url || !key) {
  console.error("חסר Supabase env");
  process.exit(1);
}
if (!resendKey) {
  console.error("חסר RESEND_API_KEY — הוסף ב-Vercel והרץ: npx vercel env pull .env.production.local --environment=production");
  process.exit(1);
}

const emailTo = (
  process.env.ORDER_REPORT_EMAIL ??
  process.env.NEXT_PUBLIC_ORDER_EMAIL ??
  "salestzvi@gmail.com"
).toLowerCase();

const sb = createClient(url, key);
const { data, error } = await sb
  .from("store_orders")
  .select(
    "id, store_id, store_name, username, items, total_amount, notes, created_at",
  )
  .eq("whatsapp_channel", "default")
  .order("created_at", { ascending: false })
  .limit(200);

if (error) {
  console.error("DB:", error.message);
  process.exit(1);
}

const orders = data ?? [];
console.log(`נמצאו ${orders.length} הזמנות`);

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("הזמנות", { views: [{ rightToLeft: true }] });
sheet.columns = [
  { header: "תאריך", key: "date", width: 18 },
  { header: "שם חנות", key: "store", width: 22 },
  { header: "משתמש", key: "user", width: 14 },
  { header: 'סה"כ', key: "total", width: 12 },
  { header: "הערות", key: "notes", width: 30 },
];

for (const order of orders) {
  sheet.addRow({
    date: new Date(order.created_at).toLocaleString("he-IL"),
    store: order.store_name,
    user: order.username,
    total: order.total_amount,
    notes: order.notes ?? "",
  });
}

const xlsx = await workbook.xlsx.writeBuffer();
const filename = `hazmanot-bdika-${new Date().toISOString().slice(0, 10)}.xlsx`;
const from =
  process.env.ORDER_REPORT_FROM?.trim() ?? "bri-catalog <onboarding@resend.dev>";

console.log(`שולח ל-${emailTo}...`);

const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${resendKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from,
    to: [emailTo],
    subject: "בדיקת דוח הזמנות bri-catalog",
    text: [
      "שלום,",
      "",
      `זה מייל בדיקה — דוח אקסל עם ${orders.length} הזמנות מהמערכת.`,
      "ההזמנות לא נמחקו.",
      "ב-1 לכל חודש יישלח דוח של החודש הקודם אוטומטית.",
    ].join("\n"),
    attachments: [
      { filename, content: Buffer.from(xlsx).toString("base64") },
    ],
  }),
});

const body = await response.text();
if (!response.ok) {
  console.error("Resend שגיאה:", response.status, body);
  process.exit(1);
}

console.log("✓ נשלח בהצלחה ל-", emailTo);
