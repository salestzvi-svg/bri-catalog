export type WhatsAppChannel = "default" | "b";

export function getWhatsAppNumber(channel?: WhatsAppChannel | null): string {
  if (channel === "b") {
    return (
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER_2 ?? "972527188812"
    );
  }
  return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "972555662240";
}

export function getOrderEmail(channel?: WhatsAppChannel | null): string {
  if (channel === "b") {
    return (
      process.env.NEXT_PUBLIC_ORDER_EMAIL_2 ?? "P27188812@GMAIL.COM"
    ).toLowerCase();
  }
  return (
    process.env.NEXT_PUBLIC_ORDER_EMAIL ?? "ykavanatalev@gmail.com"
  ).toLowerCase();
}

export function buildOrderMessageLines(
  storeName: string,
  items: { sku: string; quantity: number; name?: string }[],
  notes?: string,
  total?: number,
) {
  const lines = [
    `הזמנה מ: ${storeName}`,
    "─────────────────",
    ...items.map((item) => {
      const label = item.name?.trim() || item.sku;
      return `• ${label} | מק"ט: ${item.sku} × ${item.quantity}`;
    }),
    "─────────────────",
  ];

  if (total !== undefined && total > 0) {
    lines.push(
      `סה"כ: ₪${total.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
    );
  }

  if (notes?.trim()) {
    lines.push(`הערות: ${notes.trim()}`);
  }

  return lines;
}

export function buildWhatsAppOrderUrl(
  phone: string,
  storeName: string,
  items: { sku: string; quantity: number; name?: string }[],
  notes?: string,
  total?: number,
) {
  const text = buildOrderMessageLines(storeName, items, notes, total).join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function buildEmailOrderUrl(
  email: string,
  storeName: string,
  items: { sku: string; quantity: number; name?: string }[],
  notes?: string,
  total?: number,
) {
  const subject = encodeURIComponent(`הזמנה מ: ${storeName}`);
  const body = encodeURIComponent(
    buildOrderMessageLines(storeName, items, notes, total).join("\n"),
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}
