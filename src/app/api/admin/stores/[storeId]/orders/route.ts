import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import {
  parseStoreOrderRow,
  STORE_ORDERS_PER_STORE_LIMIT,
} from "@/lib/store-orders";

export async function GET(
  _request: Request,
  context: { params: Promise<{ storeId: string }> },
) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }

  const { storeId } = await context.params;
  if (!storeId) {
    return NextResponse.json({ error: "חסר מזהה חנות" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("store_orders")
    .select(
      "id, store_id, store_name, username, items, total_amount, notes, whatsapp_channel, created_at",
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(STORE_ORDERS_PER_STORE_LIMIT);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orders = (data ?? []).map((row) =>
    parseStoreOrderRow(row as Record<string, unknown>),
  );
  const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0);

  return NextResponse.json({
    orders,
    totalSpent,
    orderCount: orders.length,
    limit: STORE_ORDERS_PER_STORE_LIMIT,
  });
}
