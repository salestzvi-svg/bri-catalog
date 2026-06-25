import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth";
import { CATALOG_CACHE_TAG } from "@/lib/catalog";

type RouteContext = { params: Promise<{ categoryId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { categoryId } = await context.params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("category_labels")
    .select("id, category_id, name, sort_order")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ labels: data ?? [] });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { categoryId } = await context.params;
  const { name } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "יש להזין שם תווית" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: category } = await supabase
    .from("categories")
    .select("id, is_staging")
    .eq("id", categoryId)
    .maybeSingle();

  if (!category) {
    return NextResponse.json({ error: "קטגוריה לא נמצאה" }, { status: 404 });
  }

  if (category.is_staging) {
    return NextResponse.json(
      { error: "לא ניתן ליצור תוויות בקטגוריית מוצרים חדשים" },
      { status: 400 },
    );
  }

  const { count } = await supabase
    .from("category_labels")
    .select("*", { count: "exact", head: true })
    .eq("category_id", categoryId);

  const { data, error } = await supabase
    .from("category_labels")
    .insert({
      category_id: categoryId,
      name: name.trim(),
      sort_order: (count ?? 0) + 1,
    })
    .select("id, category_id, name, sort_order")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(CATALOG_CACHE_TAG, "max");
  return NextResponse.json({ label: data });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { categoryId } = await context.params;
  const body = await request.json();
  const { id, name, move } = body;

  if (!id) {
    return NextResponse.json({ error: "חסר מזהה תווית" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (move === "up" || move === "down") {
    const { data: labels, error: listError } = await supabase
      .from("category_labels")
      .select("id, sort_order")
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: true });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const index = (labels ?? []).findIndex((label) => label.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "תווית לא נמצאה" }, { status: 404 });
    }

    const swapIndex = move === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= (labels?.length ?? 0)) {
      return NextResponse.json({ success: true });
    }

    const current = labels![index];
    const neighbor = labels![swapIndex];

    await supabase
      .from("category_labels")
      .update({ sort_order: neighbor.sort_order })
      .eq("id", current.id);

    await supabase
      .from("category_labels")
      .update({ sort_order: current.sort_order })
      .eq("id", neighbor.id);

    revalidateTag(CATALOG_CACHE_TAG, "max");
    return NextResponse.json({ success: true });
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: "חסר שם" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("category_labels")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("category_id", categoryId)
    .select("id, category_id, name, sort_order")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(CATALOG_CACHE_TAG, "max");
  return NextResponse.json({ label: data });
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { categoryId } = await context.params;
  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("category_labels")
    .delete()
    .eq("id", id)
    .eq("category_id", categoryId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(CATALOG_CACHE_TAG, "max");
  return NextResponse.json({ success: true });
}
