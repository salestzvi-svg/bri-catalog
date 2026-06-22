import { NextResponse } from "next/server";
import { requireAgentSession } from "@/lib/auth";
import { createRivhitDocument } from "@/lib/rivhit-documents";

export async function POST(request: Request) {
  const session = await requireAgentSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const body = await request.json();
  const customerId = Number(body.customerId);
  const documentType = Number(body.documentType);
  const items = body.items as
    | { itemId: number; quantity: number; price?: number }[]
    | undefined;
  const comments = String(body.comments ?? "");
  const totalAmount = Number(body.totalAmount ?? 0);

  if (!customerId || !documentType || !items?.length) {
    return NextResponse.json(
      { error: "חסרים פרטי לקוח, סוג מסמך או פריטים" },
      { status: 400 },
    );
  }

  try {
    const docItems = items.map((item) => ({
      item_id: item.itemId,
      quantity: item.quantity,
      ...(item.price && item.price > 0 ? { price_nis: item.price } : {}),
    }));

    const payments =
      documentType === 2 && totalAmount > 0
        ? [
            {
              payment_type: 2,
              amount_nis: totalAmount,
              description: "תשלום מזומן — ממשק סוכן",
            },
          ]
        : undefined;

    const result = await createRivhitDocument({
      documentType,
      customerId,
      agentId: session.rivhitAgentId!,
      items: docItems,
      comments,
      payments,
    });

    return NextResponse.json({
      success: true,
      documentType: result.document_type,
      documentNumber: result.document_number,
      documentLink: result.document_link ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בשליחה לריווחית" },
      { status: 500 },
    );
  }
}
