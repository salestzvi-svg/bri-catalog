import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { setSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password?.trim()) {
      return NextResponse.json({ error: "יש להזין סיסמה" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("super_admin_settings")
      .select("password_hash")
      .eq("id", 1)
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error:
            "הגדרות מנהל ראשי לא נמצאו — הרץ migration-add-super-admin.sql ב-Supabase",
        },
        { status: 500 },
      );
    }

    const valid = await verifyPassword(password, data.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "סיסמה שגויה" }, { status: 401 });
    }

    await setSession({ role: "super_admin" });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בהתחברות" },
      { status: 500 },
    );
  }
}
