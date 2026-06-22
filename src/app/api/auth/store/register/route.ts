import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hashPassword, setSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { storeName, username, password } = await request.json();

    if (!storeName?.trim() || !username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "יש למלא שם חנות, שם משתמש וסיסמה" },
        { status: 400 },
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "הסיסמה חייבת להכיל לפחות 4 תווים" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabase
      .from("stores")
      .insert({
        store_name: storeName.trim(),
        username: username.trim(),
        password_hash: passwordHash,
      })
      .select("id, store_name, username")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "שם החנות ושם המשתמש כבר קיימים. נסה להתחבר." },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await setSession({
      role: "store",
      storeId: data.id,
      storeName: data.store_name,
      username: data.username,
    });

    return NextResponse.json({
      success: true,
      storeName: data.store_name,
      username: data.username,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בהרשמה";
    const friendly =
      message.includes("fetch failed") || message.includes("Missing Supabase")
        ? "בעיית חיבור למסד הנתונים. בדוק הגדרות Supabase ב-Vercel."
        : message;

    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
