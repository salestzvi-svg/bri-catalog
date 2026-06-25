import type { SupabaseClient } from "@supabase/supabase-js";
import { parseStoreOrderRow } from "./store-orders";

export async function fetchStoreOrders(
  supabase: SupabaseClient,
  options?: {
    storeId?: string | null;
    channel?: "default" | "b";
    from?: Date;
    to?: Date;
    limit?: number;
  },
) {
  let query = supabase
    .from("store_orders")
    .select(
      "id, store_id, store_name, username, items, total_amount, notes, whatsapp_channel, created_at",
    )
    .order("created_at", { ascending: false });

  if (options?.channel) {
    query = query.eq("whatsapp_channel", options.channel);
  } else {
    query = query.eq("whatsapp_channel", "default");
  }

  if (options?.storeId) {
    query = query.eq("store_id", options.storeId);
  }

  if (options?.from) {
    query = query.gte("created_at", options.from.toISOString());
  }

  if (options?.to) {
    query = query.lt("created_at", options.to.toISOString());
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) =>
    parseStoreOrderRow(row as Record<string, unknown>),
  );
}

export function getPreviousCalendarMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return { start, end };
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}
