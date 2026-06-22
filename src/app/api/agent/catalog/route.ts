import { NextResponse } from "next/server";
import { getCatalogProducts } from "@/lib/catalog";
import { requireAgentSession } from "@/lib/auth";

export async function GET() {
  const session = await requireAgentSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  try {
    const products = await getCatalogProducts();
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בטעינה" },
      { status: 500 },
    );
  }
}
