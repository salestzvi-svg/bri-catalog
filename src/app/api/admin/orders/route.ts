import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import {
  parseStoreOrderRow,
  STORE_ORDERS_LIST_LIMIT,
} from "@/lib/store-orders";

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }

  const isSuperAdmin = session.role === "super_admin";
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId");

  const supabase = createAdminClient();
  let query = supabase
    .from("store_orders")
    .select(
      "id, store_id, store_name, username, items, total_amount, notes, whatsapp_channel, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(STORE_ORDERS_LIST_LIMIT);

  if (!isSuperAdmin) {
    query = query.eq("whatsapp_channel", "b");
  }

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orders = (data ?? []).map((row) =>
    parseStoreOrderRow(row as Record<string, unknown>),
  );
  const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0);

  return NextResponse.json({
    orders,
    orderCount: orders.length,
    totalSpent,
    limit: STORE_ORDERS_LIST_LIMIT,
    linkFilter: isSuperAdmin ? "all" : "b",
  });
}
