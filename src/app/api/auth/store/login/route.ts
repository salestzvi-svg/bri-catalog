import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hashPassword, setSession } from "@/lib/auth";
import { insertStore, trackStoreLogin } from "@/lib/store-channels";
import {
  DEFAULT_STORE_USERNAME,
  findStoreByNameAndPassword,
  storeNameExists,
  type StoreLoginRow,
} from "@/lib/store-auth";
import type { WhatsAppChannel } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { storeName, password, channel } = await request.json();

    if (!storeName?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "יש למלא שם חנות וסיסמה" },
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
    const trimmedPassword = password.trim();
    const channelValue: WhatsAppChannel = channel === "b" ? "b" : "default";

    let store: StoreLoginRow | null = await findStoreByNameAndPassword(
      supabase,
      trimmedStore,
      trimmedPassword,
    );
    const isNew = !store;

    if (!store) {
      if (await storeNameExists(supabase, trimmedStore)) {
        return NextResponse.json({ error: "סיסמה שגויה" }, { status: 401 });
      }

      const { data: created, error: createError } = await insertStore(supabase, {
        store_name: trimmedStore,
        username: DEFAULT_STORE_USERNAME,
        password_hash: await hashPassword(trimmedPassword),
      });

      if (createError) {
        if (createError.code === "23505") {
          return NextResponse.json(
            { error: "שם החנות כבר קיים — הזן את הסיסמה הנכונה" },
            { status: 409 },
          );
        }
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      if (!created?.id) {
        return NextResponse.json({ error: "שגיאה ביצירת חנות" }, { status: 500 });
      }

      store = {
        id: created.id,
        store_name: created.store_name,
        username: created.username,
        password_hash: created.password_hash,
      };
    }

    await trackStoreLogin(supabase, store.id, channelValue, isNew);

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
      isNew,
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
