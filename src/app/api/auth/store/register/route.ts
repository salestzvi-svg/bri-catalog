import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hashPassword, setSession } from "@/lib/auth";
import { DEFAULT_STORE_USERNAME, storeNameExists } from "@/lib/store-auth";
import { insertStore } from "@/lib/store-channels";

export async function POST(request: Request) {
  try {
    const { storeName, password } = await request.json();

    if (!storeName?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "יש למלא שם חנות וסיסמה" },
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
    const trimmedStore = storeName.trim();

    if (await storeNameExists(supabase, trimmedStore)) {
      return NextResponse.json(
        { error: "שם החנות כבר קיים. נסה להתחבר." },
        { status: 409 },
      );
    }

    const { data, error } = await insertStore(supabase, {
      store_name: trimmedStore,
      username: DEFAULT_STORE_USERNAME,
      password_hash: await hashPassword(password),
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "שם החנות כבר קיים. נסה להתחבר." },
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
