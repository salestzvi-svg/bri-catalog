import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hashPassword, requireSuperAdminSession } from "@/lib/auth";

export async function PUT(request: Request) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }

  const { newPassword } = await request.json();
  if (!newPassword?.trim() || newPassword.trim().length < 6) {
    return NextResponse.json(
      { error: "הסיסמה חייבת להכיל לפחות 6 תווים" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("admin_settings")
    .update({
      password_hash: await hashPassword(newPassword.trim()),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
