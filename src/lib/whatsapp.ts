export type WhatsAppChannel = "default" | "b";

export function getWhatsAppNumber(_channel?: WhatsAppChannel | null): string {
  return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "972502156774";
}

export function getOrderEmail(_channel?: WhatsAppChannel | null): string {
  return (
    process.env.NEXT_PUBLIC_ORDER_EMAIL ?? "salestzvi@gmail.com"
  ).toLowerCase();
}

export function buildOrderMessageLines(
  storeName: string,
  items: { sku: string; quantity: number; name?: string }[],
  notes?: string,
  total?: number,
  options?: { subtotal?: number; deliveryFee?: number },
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

  const subtotal = options?.subtotal;
  const deliveryFee = options?.deliveryFee ?? 0;

  if (subtotal !== undefined && subtotal > 0 && deliveryFee > 0) {
    lines.push(
      `סכום מוצרים: ₪${subtotal.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
    );
    lines.push(
      `משלוח: ₪${deliveryFee.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
    );
  }

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
  options?: { subtotal?: number; deliveryFee?: number },
) {
  const text = buildOrderMessageLines(storeName, items, notes, total, options).join(
    "\n",
  );
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function buildEmailOrderUrl(
  email: string,
  storeName: string,
  items: { sku: string; quantity: number; name?: string }[],
  notes?: string,
  total?: number,
  options?: { subtotal?: number; deliveryFee?: number },
) {
  const subject = encodeURIComponent(`הזמנה מ: ${storeName}`);
  const body = encodeURIComponent(
    buildOrderMessageLines(storeName, items, notes, total, options).join("\n"),
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}
