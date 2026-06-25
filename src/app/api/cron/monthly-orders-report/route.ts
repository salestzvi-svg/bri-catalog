import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  fetchStoreOrders,
  formatMonthLabel,
  getPreviousCalendarMonthRange,
} from "@/lib/fetch-store-orders";
import {
  buildOrdersExcelBuffer,
  ordersExportFilename,
} from "@/lib/orders-excel";
import { sendOrdersReportEmail, getOrderReportEmail } from "@/lib/order-report-email";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { start, end } = getPreviousCalendarMonthRange();
  const monthLabel = formatMonthLabel(start);

  try {
    const supabase = createAdminClient();
    const orders = await fetchStoreOrders(supabase, {
      channel: "default",
      from: start,
      to: end,
    });

    const buffer = await buildOrdersExcelBuffer(orders);
    const filename = ordersExportFilename(`hazmanot-${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`);

    const emailResult = await sendOrdersReportEmail({
      subject: `דוח הזמנות bri-catalog — ${monthLabel}`,
      body: [
        `שלום,`,
        ``,
        `מצורף דוח אקסל של כל ההזמנות מחודש ${monthLabel}.`,
        `סה"כ ${orders.length} הזמנות.`,
        ``,
        orders.length > 0
          ? `לאחר שליחת הדוח, ההזמנות של החודש הזה נמחקו מהמערכת.`
          : `לא היו הזמנות בחודש ${monthLabel}.`,
      ].join("\n"),
      attachment: buffer,
      filename,
    });

    let deletedCount = 0;
    if (orders.length > 0) {
      const ids = orders.map((o) => o.id);
      const { error: deleteError } = await supabase
        .from("store_orders")
        .delete()
        .in("id", ids);

      if (deleteError) {
        return NextResponse.json(
          {
            error: deleteError.message,
            exported: orders.length,
            emailSent: emailResult.sent,
          },
          { status: 500 },
        );
      }
      deletedCount = ids.length;
    }

    return NextResponse.json({
      success: true,
      month: monthLabel,
      exported: orders.length,
      deleted: deletedCount,
      emailSent: emailResult.sent,
      emailTo: getOrderReportEmail(),
      emailError: emailResult.error ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בדוח חודשי";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
