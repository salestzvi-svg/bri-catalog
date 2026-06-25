import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  hashPassword,
  requireAdminSession,
} from "@/lib/auth";
import { insertStore, listStores } from "@/lib/store-channels";
import { DEFAULT_STORE_USERNAME, storeNameExists } from "@/lib/store-auth";

function parseDiscount(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
  return Math.round(parsed * 100) / 100;
}

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
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

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { storeName, password, discountPercent } = await request.json();

  const name = String(storeName ?? "").trim();
  const pass = String(password ?? "").trim();
  const discount = parseDiscount(discountPercent);

  if (!name || !pass) {
    return NextResponse.json(
      { error: "יש למלא שם חנות וסיסמה" },
      { status: 400 },
    );
  }

  if (pass.length < 4) {
    return NextResponse.json(
      { error: "הסיסמה חייבת להכיל לפחות 4 תווים" },
      { status: 400 },
    );
  }

  if (discount === null) {
    return NextResponse.json(
      { error: "אחוז הנחה חייב להיות בין 0 ל-100" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  if (await storeNameExists(supabase, name)) {
    return NextResponse.json(
      { error: "שם החנות כבר קיים במערכת" },
      { status: 400 },
    );
  }

  const { data, error } = await insertStore(supabase, {
    store_name: name,
    username: DEFAULT_STORE_USERNAME,
    password_hash: await hashPassword(pass),
    discount_percent: discount,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "שם החנות כבר קיים" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, store: data });
}

export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { id, password, storeName, discountPercent } = await request.json();
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

  if (discountPercent !== undefined) {
    const discount = parseDiscount(discountPercent);
    if (discount === null) {
      return NextResponse.json(
        { error: "אחוז הנחה חייב להיות בין 0 ל-100" },
        { status: 400 },
      );
    }
    updates.discount_percent = discount;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "אין מה לעדכן" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("stores")
    .update(updates)
    .eq("id", id)
    .select("id, store_name, username, discount_percent")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "שם החנות כבר קיים במערכת" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, store: data });
}
