import ExcelJS from "exceljs";
import type { StoreOrder, StoreOrderItem } from "./types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatMoney(value: number): number | string {
  if (!value || value <= 0) return "";
  return Math.round(value * 100) / 100;
}

function formatProductsList(items: StoreOrderItem[]): string {
  if (items.length === 0) return "";
  return items
    .map((item) => {
      const qty = item.quantity;
      const name = item.name?.trim() || item.sku;
      return `${name} (מק״ט ${item.sku}) × ${qty}`;
    })
    .join(" | ");
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD1FAE5" },
  };
}

function styleOrderHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0F2FE" },
  };
}

export async function buildOrdersExcelBuffer(orders: StoreOrder[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "bri-catalog";
  workbook.created = new Date();

  // גיליון 1 — כל הזמנה בבלוק עם כל המוצרים שלה
  const grouped = workbook.addWorksheet("דוח הזמנות מפורט", {
    views: [{ rightToLeft: true }],
  });
  grouped.columns = [
    { header: "תאריך", key: "date", width: 17 },
    { header: "שם חנות", key: "store", width: 20 },
    { header: "משתמש", key: "user", width: 12 },
    { header: 'מק"ט', key: "sku", width: 14 },
    { header: "שם מוצר", key: "name", width: 32 },
    { header: "כמות", key: "qty", width: 8 },
    { header: "מחיר יחידה", key: "unit", width: 11 },
    { header: "סכום שורה", key: "line", width: 11 },
    { header: 'סה"כ הזמנה', key: "orderTotal", width: 11 },
    { header: "הערות", key: "notes", width: 22 },
  ];
  styleHeaderRow(grouped.getRow(1));

  // גיליון 2 — שורה אחת לכל מוצר (נוח לסינון)
  const details = workbook.addWorksheet("כל הפריטים", {
    views: [{ rightToLeft: true }],
  });
  details.columns = [
    { header: "תאריך", key: "date", width: 17 },
    { header: "שם חנות", key: "store", width: 20 },
    { header: "משתמש", key: "user", width: 12 },
    { header: 'מק"ט', key: "sku", width: 14 },
    { header: "שם מוצר", key: "name", width: 32 },
    { header: "כמות", key: "qty", width: 8 },
    { header: "מחיר יחידה", key: "unit", width: 11 },
    { header: "סכום שורה", key: "line", width: 11 },
    { header: 'סה"כ הזמנה', key: "orderTotal", width: 11 },
    { header: "הערות", key: "notes", width: 22 },
  ];
  styleHeaderRow(details.getRow(1));

  // גיליון 3 — סיכום עם רשימת מוצרים בטקסט
  const summary = workbook.addWorksheet("סיכום", {
    views: [{ rightToLeft: true }],
  });
  summary.columns = [
    { header: "תאריך", key: "date", width: 17 },
    { header: "שם חנות", key: "store", width: 20 },
    { header: "משתמש", key: "user", width: 12 },
    { header: "מספר פריטים", key: "itemCount", width: 12 },
    { header: 'סה"כ (₪)', key: "total", width: 11 },
    { header: "פירוט מוצרים", key: "products", width: 60 },
    { header: "הערות", key: "notes", width: 22 },
  ];
  styleHeaderRow(summary.getRow(1));

  for (const order of orders) {
    const date = formatDate(order.created_at);
    const notes = order.notes ?? "";
    const orderTotal = formatMoney(order.total_amount);
    const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

    summary.addRow({
      date,
      store: order.store_name,
      user: order.username,
      itemCount,
      total: orderTotal,
      products: formatProductsList(order.items),
      notes,
    });

    if (order.items.length === 0) {
      const headerRow = grouped.addRow({
        date,
        store: order.store_name,
        user: order.username,
        sku: "",
        name: "(אין פריטים)",
        qty: "",
        unit: "",
        line: "",
        orderTotal,
        notes,
      });
      styleOrderHeaderRow(headerRow);
      grouped.addRow({});
      continue;
    }

    order.items.forEach((item, index) => {
      const rowData = {
        date: index === 0 ? date : "",
        store: index === 0 ? order.store_name : "",
        user: index === 0 ? order.username : "",
        sku: item.sku,
        name: item.name,
        qty: item.quantity,
        unit: item.unitPrice != null ? formatMoney(item.unitPrice) : "",
        line: item.lineTotal != null ? formatMoney(item.lineTotal) : "",
        orderTotal: index === 0 ? orderTotal : "",
        notes: index === 0 ? notes : "",
      };

      const groupedRow = grouped.addRow(rowData);
      if (index === 0) {
        styleOrderHeaderRow(groupedRow);
      }

      details.addRow({
        date,
        store: order.store_name,
        user: order.username,
        sku: item.sku,
        name: item.name,
        qty: item.quantity,
        unit: item.unitPrice != null ? formatMoney(item.unitPrice) : "",
        line: item.lineTotal != null ? formatMoney(item.lineTotal) : "",
        orderTotal,
        notes,
      });
    });

    grouped.addRow({});
  }

  if (orders.length === 0) {
    summary.addRow({ date: "", store: "אין הזמנות בתקופה", user: "" });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function ordersExportFilename(prefix = "orders"): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${stamp}.xlsx`;
}
