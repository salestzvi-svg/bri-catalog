import { NextResponse } from "next/server";
import { getCustomerLinks } from "@/lib/app-url";
import { requireAdminSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const host = request.headers.get("host");
  return NextResponse.json(getCustomerLinks(host));
}
