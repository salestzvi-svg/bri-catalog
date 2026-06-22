import { NextResponse } from "next/server";
import { getCachedCatalogProducts } from "@/lib/catalog";
import { requireStoreSession } from "@/lib/auth";

export async function GET() {
  const session = await requireStoreSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  try {
    const products = await getCachedCatalogProducts();
    return NextResponse.json(
      {
        storeName: session.storeName,
        whatsappChannel: session.whatsappChannel ?? "default",
        products,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בטעינת קטלוג" },
      { status: 500 },
    );
  }
}
