import { NextResponse } from "next/server";
import { requireAgentSession } from "@/lib/auth";
import {
  fetchRivhitDocumentTypes,
  RIVHIT_DEFAULT_ORDER_TYPE,
} from "@/lib/rivhit-documents";

export async function GET() {
  const session = await requireAgentSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  try {
    const types = await fetchRivhitDocumentTypes();
    return NextResponse.json({
      types,
      defaultTypeId: RIVHIT_DEFAULT_ORDER_TYPE,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בטעינה" },
      { status: 500 },
    );
  }
}
