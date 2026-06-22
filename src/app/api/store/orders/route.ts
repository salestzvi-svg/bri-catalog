import { NextResponse } from "next/server";
import { requireStoreSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { trimStoreOrdersForChannel } from "@/lib/store-orders";
import type { StoreOrderItem, WhatsAppChannel } from "@/lib/types";

function parseItems(raw: unknown): StoreOrderItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const items: StoreOrderItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") return null;
    const item = row as Record<string, unknown>;
    const sku = String(item.sku ?? "").trim();
    const name = String(item.name ?? sku).trim();
    const quantity = Number(item.quantity);
    if (!sku || !Number.isFinite(quantity) || quantity <= 0) return null;

    const unitPrice =
      item.unitPrice === null || item.unitPrice === undefined
        ? null
        : Number(item.unitPrice);
    const lineTotal =
      item.lineTotal === null || item.lineTotal === undefined
        ? null
        : Number(item.lineTotal);

    items.push({
      sku,
      name: name || sku,
      quantity: Math.round(quantity),
      unitPrice:
        unitPrice !== null && Number.isFinite(unitPrice) && unitPrice >= 0
          ? unitPrice
          : null,
      lineTotal:
        lineTotal !== null && Number.isFinite(lineTotal) && lineTotal >= 0
          ? lineTotal
          : null,
    });
  }

  return items.length > 0 ? items : null;
}

export async function POST(request: Request) {
  const session = await requireStoreSession();
  if (!session?.storeId) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const body = await request.json();
  const items = parseItems(body.items);
  if (!items) {
    return NextResponse.json({ error: "העגלה ריקה או לא תקינה" }, { status: 400 });
  }

  const totalAmount = Number(body.totalAmount ?? 0);
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;
  const channel: WhatsAppChannel =
    session.whatsappChannel === "b" ? "b" : "default";

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("store_orders")
    .insert({
      store_id: session.storeId,
      store_name: session.storeName ?? "",
      username: session.username ?? "",
      items,
      total_amount: Number.isFinite(totalAmount) && totalAmount >= 0 ? totalAmount : 0,
      notes,
      whatsapp_channel: channel,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await trimStoreOrdersForChannel(supabase, channel);

  return NextResponse.json({ success: true, orderId: data.id });
}
