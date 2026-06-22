import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (
    !session ||
    (session.role !== "admin" && session.role !== "super_admin")
  ) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  return NextResponse.json({
    role: session.role,
    isSuperAdmin: session.role === "super_admin",
  });
}
