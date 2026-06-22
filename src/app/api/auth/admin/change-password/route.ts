import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hashPassword, requireAdminSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "יש למלא סיסמה נוכחית וחדשה" },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "הסיסמה החדשה חייבת להכיל לפחות 6 תווים" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("admin_settings")
      .select("password_hash")
      .eq("id", 1)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "הגדרות לא נמצאו" }, { status: 500 });
    }

    const valid = await verifyPassword(currentPassword, data.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "סיסמה נוכחית שגויה" }, { status: 401 });
    }

    const passwordHash = await hashPassword(newPassword);
    const { error: updateError } = await supabase
      .from("admin_settings")
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq("id", 1);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בעדכון" },
      { status: 500 },
    );
  }
}
