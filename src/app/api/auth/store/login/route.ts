import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hashPassword, setSession, verifyPassword } from "@/lib/auth";
import { insertStore, trackStoreLogin } from "@/lib/store-channels";
import type { WhatsAppChannel } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { storeName, username, password, channel } = await request.json();

    if (!storeName?.trim() || !username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "יש למלא שם חנות, שם משתמש וסיסמה" },
        { status: 400 },
      );
    }

    if (password.trim().length < 4) {
      return NextResponse.json(
        { error: "הסיסמה חייבת להכיל לפחות 4 תווים" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const trimmedStore = storeName.trim();
    const trimmedUser = username.trim();
    const trimmedPassword = password.trim();
    const channelValue: WhatsAppChannel = channel === "b" ? "b" : "default";

    const { data: existing, error: lookupError } = await supabase
      .from("stores")
      .select("id, store_name, username, password_hash")
      .eq("store_name", trimmedStore)
      .eq("username", trimmedUser)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 });
    }

    let store = existing;

    if (!store) {
      const { data: created, error: createError } = await insertStore(supabase, {
          store_name: trimmedStore,
          username: trimmedUser,
          password_hash: await hashPassword(trimmedPassword),
        });

      if (createError) {
        if (createError.code === "23505") {
          return NextResponse.json(
            { error: "שם החנות והמשתמש כבר קיימים — הזן את הסיסמה הנכונה" },
            { status: 409 },
          );
        }
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      store = created;
    } else {
      const valid = await verifyPassword(trimmedPassword, store.password_hash);
      if (!valid) {
        return NextResponse.json({ error: "סיסמה שגויה" }, { status: 401 });
      }
    }

    await trackStoreLogin(supabase, store.id, channelValue, !existing);

    await setSession({
      role: "store",
      storeId: store.id,
      storeName: store.store_name,
      username: store.username,
      whatsappChannel: channelValue,
    });

    return NextResponse.json({
      success: true,
      storeName: store.store_name,
      username: store.username,
      isNew: !existing,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בכניסה";
    const friendly =
      message.includes("fetch failed") || message.includes("Missing Supabase")
        ? "בעיית חיבור למסד הנתונים. נסה שוב מאוחר יותר."
        : message;

    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
