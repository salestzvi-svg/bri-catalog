import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireStoreSession } from "@/lib/auth";

export async function GET() {
  const session = await requireStoreSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("message, image_url, is_active, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ active: false });
  }

  const hasContent =
    Boolean(data?.message?.trim()) || Boolean(data?.image_url?.trim());

  if (!data || !data.is_active || !hasContent) {
    return NextResponse.json({ active: false });
  }

  return NextResponse.json({
    active: true,
    message: data.message ?? "",
    imageUrl: data.image_url ?? "",
    updatedAt: data.updated_at,
  });
}
