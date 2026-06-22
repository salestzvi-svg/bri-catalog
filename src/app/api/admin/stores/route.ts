import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  hashPassword,
  requireSuperAdminSession,
} from "@/lib/auth";
import { listStores } from "@/lib/store-channels";

export async function GET() {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const result = await listStores(supabase);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({
    stores: result.data ?? [],
    trackingEnabled: result.trackingEnabled,
  });
}

export async function PATCH(request: Request) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: "פעולה זו זמינה למנהל ראשי בלבד" },
      { status: 403 },
    );
  }

  const { id, password, storeName, username } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "חסר מזהה חנות" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (password !== undefined) {
    if (!password?.trim() || password.trim().length < 4) {
      return NextResponse.json(
        { error: "הסיסמה חייבת להכיל לפחות 4 תווים" },
        { status: 400 },
      );
    }
    updates.password_hash = await hashPassword(password.trim());
  }

  if (storeName !== undefined) {
    const name = String(storeName).trim();
    if (!name) {
      return NextResponse.json({ error: "שם חנות לא יכול להיות ריק" }, { status: 400 });
    }
    updates.store_name = name;
  }

  if (username !== undefined) {
    const user = String(username).trim();
    if (!user) {
      return NextResponse.json({ error: "שם משתמש לא יכול להיות ריק" }, { status: 400 });
    }
    updates.username = user;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "אין מה לעדכן" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("stores")
    .update(updates)
    .eq("id", id)
    .select("id, store_name, username")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "שם חנות ומשתמש כבר קיימים במערכת" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, store: data });
}
