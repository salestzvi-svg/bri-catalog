import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchStoreOrders } from "@/lib/fetch-store-orders";
import {
  buildOrdersExcelBuffer,
  ordersExportFilename,
} from "@/lib/orders-excel";
import { STORE_ORDERS_LIST_LIMIT } from "@/lib/store-orders";

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId");

  try {
    const supabase = createAdminClient();
    const orders = await fetchStoreOrders(supabase, {
      storeId,
      channel: "default",
      limit: STORE_ORDERS_LIST_LIMIT,
    });

    const buffer = await buildOrdersExcelBuffer(orders);
    const filename = ordersExportFilename("hazmanot");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בייצוא";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
