import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth";
import { CATALOG_CACHE_TAG } from "@/lib/catalog";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, sort_order, is_staging")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ categories: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "יש להזין שם קטגוריה" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: name.trim(), sort_order: (count ?? 0) + 1 })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(CATALOG_CACHE_TAG, "max");
  return NextResponse.json({ category: data });
}

export async function DELETE(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: category, error: lookupError } = await supabase
    .from("categories")
    .select("is_staging")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  if (category?.is_staging) {
    return NextResponse.json(
      { error: "לא ניתן למחוק את קטגוריית מוצרים חדשים" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(CATALOG_CACHE_TAG, "max");
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const body = await request.json();
  const { id, name, move } = body;

  if (!id) {
    return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: existingCategory, error: categoryError } = await supabase
    .from("categories")
    .select("is_staging")
    .eq("id", id)
    .maybeSingle();

  if (categoryError) {
    return NextResponse.json({ error: categoryError.message }, { status: 500 });
  }

  if (existingCategory?.is_staging && name !== undefined) {
    return NextResponse.json(
      { error: "לא ניתן לשנות את שם קטגוריית מוצרים חדשים" },
      { status: 400 },
    );
  }

  if (move === "up" || move === "down") {
    const { data: categories, error: listError } = await supabase
      .from("categories")
      .select("id, sort_order")
      .order("sort_order", { ascending: true });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const index = (categories ?? []).findIndex((c) => c.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "קטגוריה לא נמצאה" }, { status: 404 });
    }

    const swapIndex = move === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= (categories?.length ?? 0)) {
      return NextResponse.json({ success: true });
    }

    const current = categories![index];
    const neighbor = categories![swapIndex];

    await supabase
      .from("categories")
      .update({ sort_order: neighbor.sort_order })
      .eq("id", current.id);

    await supabase
      .from("categories")
      .update({ sort_order: current.sort_order })
      .eq("id", neighbor.id);

    revalidateTag(CATALOG_CACHE_TAG, "max");
    return NextResponse.json({ success: true });
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: "חסר שם" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("categories")
    .update({ name: name.trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(CATALOG_CACHE_TAG, "max");
  return NextResponse.json({ category: data });
}
