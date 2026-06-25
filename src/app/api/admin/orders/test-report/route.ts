import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchStoreOrders } from "@/lib/fetch-store-orders";
import {
  buildOrdersExcelBuffer,
  ordersExportFilename,
} from "@/lib/orders-excel";
import {
  getOrderReportEmail,
  sendOrdersReportEmail,
} from "@/lib/order-report-email";
import { STORE_ORDERS_LIST_LIMIT } from "@/lib/store-orders";

/** שליחת דוח בדיקה למייל — לא מוחק הזמנות */
export async function POST() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error: "RESEND_API_KEY לא מוגדר ב-Vercel",
        emailTo: getOrderReportEmail(),
      },
      { status: 400 },
    );
  }

  try {
    const supabase = createAdminClient();
    const orders = await fetchStoreOrders(supabase, {
      channel: "default",
      limit: STORE_ORDERS_LIST_LIMIT,
    });

    const buffer = await buildOrdersExcelBuffer(orders);
    const filename = ordersExportFilename("hazmanot-bdika");

    const emailResult = await sendOrdersReportEmail({
      subject: "בדיקת דוח הזמנות bri-catalog",
      body: [
        "שלום,",
        "",
        "זה מייל בדיקה — דוח אקסל של כל ההזמנות השמורות כרגע במערכת.",
        `סה"כ ${orders.length} הזמנות.`,
        "",
        "ההזמנות לא נמחקו. ב-1 לכל חודש יישלח דוח של החודש הקודם וההזמנות של אותו חודש יימחקו.",
      ].join("\n"),
      attachment: buffer,
      filename,
    });

    if (!emailResult.sent) {
      return NextResponse.json(
        {
          error: emailResult.error ?? "שליחת המייל נכשלה",
          orderCount: orders.length,
          emailTo: getOrderReportEmail(),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      orderCount: orders.length,
      emailSent: true,
      emailTo: getOrderReportEmail(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בשליחה";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
