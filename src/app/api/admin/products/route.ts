import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { requireAdminSession } from "@/lib/auth";
import { CATALOG_CACHE_TAG } from "@/lib/catalog";
import {
  clearRivhitItemsCache,
  fetchRivhitItems,
  getSku,
  resolveImageUrl,
  resolveProductImage,
} from "@/lib/rivhit";
import {
  ensureStagingCategory,
  syncNewItemsToStagingCategory,
} from "@/lib/staging-category";
import type { ProductOverride } from "@/lib/types";

interface ProductMappingRow {
  rivhit_item_id: number;
  category_id: string;
  sort_order?: number;
  variant_group_id?: string | null;
}

async function linkVariantProducts(
  supabase: ReturnType<typeof createAdminClient>,
  itemId: number,
  linkToItemId: number,
) {
  if (itemId === linkToItemId) {
    throw new Error("לא ניתן לחבר מוצר לעצמו");
  }

  const { data: mappings, error } = await supabase
    .from("product_mappings")
    .select("rivhit_item_id, variant_group_id")
    .in("rivhit_item_id", [itemId, linkToItemId]);

  if (error) throw new Error(error.message);

  const current = mappings?.find((row) => row.rivhit_item_id === itemId);
  const target = mappings?.find((row) => row.rivhit_item_id === linkToItemId);

  if (!current || !target) {
    throw new Error("אחד המוצרים לא נמצא");
  }

  const groupA = current.variant_group_id as string | null;
  const groupB = target.variant_group_id as string | null;

  if (groupA && groupB) {
    if (groupA === groupB) return;
    const { error: mergeError } = await supabase
      .from("product_mappings")
      .update({ variant_group_id: groupA })
      .eq("variant_group_id", groupB);
    if (mergeError) throw new Error(mergeError.message);
    return;
  }

  const targetGroup = groupA ?? groupB ?? randomUUID();
  const toUpdate = [itemId, linkToItemId].filter((id) => {
    const row = id === itemId ? current : target;
    return row.variant_group_id !== targetGroup;
  });

  if (toUpdate.length === 0) return;

  const { error: linkError } = await supabase
    .from("product_mappings")
    .update({ variant_group_id: targetGroup })
    .in("rivhit_item_id", toUpdate);

  if (linkError) throw new Error(linkError.message);
}

async function unlinkVariantProduct(
  supabase: ReturnType<typeof createAdminClient>,
  itemId: number,
) {
  const { error } = await supabase
    .from("product_mappings")
    .update({ variant_group_id: null })
    .eq("rivhit_item_id", itemId);

  if (error) throw new Error(error.message);
}

async function getLabelAssignmentsMap(supabase: ReturnType<typeof createAdminClient>) {
  try {
    const rows = await fetchAllRows<{ rivhit_item_id: number; label_id: string }>(
      supabase,
      "product_label_assignments",
      "rivhit_item_id, label_id",
    );
    const map = new Map<number, string[]>();
    for (const row of rows) {
      const list = map.get(row.rivhit_item_id) ?? [];
      list.push(row.label_id);
      map.set(row.rivhit_item_id, list);
    }
    return map;
  } catch {
    return new Map<number, string[]>();
  }
}

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  if (refresh) {
    clearRivhitItemsCache();
  }

  try {
    const supabase = createAdminClient();
    const stagingCategory = await ensureStagingCategory(supabase);
    const items = await fetchRivhitItems();

    const [overridesResult, mappingsResult, categoriesResult] =
      await Promise.all([
        fetchAllRows<ProductOverride>(supabase, "product_overrides"),
        fetchAllRows<ProductMappingRow>(supabase, "product_mappings"),
        supabase
          .from("categories")
          .select("id, name, sort_order, is_staging")
          .order("sort_order", { ascending: true }),
      ]);

    if (categoriesResult.error) throw new Error(categoriesResult.error.message);

    const overridesData = overridesResult;
    const mappingsData = mappingsResult;

    const mappedIds = new Set(
      mappingsData.map((row) => row.rivhit_item_id as number),
    );
    const syncedCount = await syncNewItemsToStagingCategory(
      supabase,
      stagingCategory.id,
      items.map((item) => item.item_id),
      mappedIds,
    );

    if (syncedCount > 0) {
      revalidateTag(CATALOG_CACHE_TAG, "max");
    }

    const mappings =
      syncedCount > 0
        ? await fetchAllRows<ProductMappingRow>(supabase, "product_mappings")
        : mappingsData;

    const overrides = new Map(
      overridesData.map((row) => [row.rivhit_item_id, row]),
    );
    const mappingsMap = new Map(
      mappings.map((row) => [row.rivhit_item_id, row]),
    );
    const categories = new Map(
      (categoriesResult.data ?? []).map((row) => [row.id, row]),
    );
    const labelAssignments = await getLabelAssignmentsMap(supabase);

    const products = items.map((item) => {
      const override = overrides.get(item.item_id);
      const mapping = mappingsMap.get(item.item_id);
      const category = mapping?.category_id
        ? categories.get(mapping.category_id)
        : null;

      return {
        itemId: item.item_id,
        sku: getSku(item),
        rivhitName: item.item_name,
        name: override?.custom_name || item.item_name,
        price: override?.custom_price ?? item.sale_nis,
        rivhitPrice: item.sale_nis,
        rivhitImage: resolveImageUrl(item.picture_link),
        image: resolveProductImage(item.picture_link, override),
        hasCustomImage: Boolean(override?.custom_image),
        hasCustomPrice: override?.custom_price != null,
        isHidden: override?.is_hidden ?? false,
        categoryId: mapping?.category_id ?? null,
        categoryName: category?.name ?? null,
        isStaging: category?.is_staging === true,
        sortOrder: mapping?.sort_order ?? 0,
        labelIds: labelAssignments.get(item.item_id) ?? [],
        variantGroupId: mapping?.variant_group_id ?? null,
        searchAliases: override?.search_aliases ?? "",
      };
    });

    return NextResponse.json({
      products,
      stagingCategoryId: stagingCategory.id,
      syncedCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בטעינת מוצרים" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      itemId,
      categoryId,
      customName,
      customPrice,
      customImage,
      isHidden,
      clearCustomImage,
      sortOrder,
      labelIds,
      linkToItemId,
      unlinkVariant,
      searchAliases,
    } = body;

    if (!itemId) {
      return NextResponse.json({ error: "חסר מזהה מוצר" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (categoryId !== undefined) {
      if (categoryId) {
        const { data: category } = await supabase
          .from("categories")
          .select("id, is_staging")
          .eq("id", categoryId)
          .maybeSingle();

        if (!category) {
          return NextResponse.json(
            { error: "קטגוריה לא נמצאה" },
            { status: 400 },
          );
        }

        const { data: existingMapping } = await supabase
          .from("product_mappings")
          .select("category_id")
          .eq("rivhit_item_id", itemId)
          .maybeSingle();

        const categoryChanged = existingMapping?.category_id !== categoryId;

        await supabase.from("product_mappings").upsert(
          {
            rivhit_item_id: itemId,
            category_id: categoryId,
            ...(categoryChanged ? { sort_order: 0 } : {}),
          },
          { onConflict: "rivhit_item_id" },
        );

        if (categoryChanged) {
          await supabase
            .from("product_label_assignments")
            .delete()
            .eq("rivhit_item_id", itemId);
        }
      } else {
        const staging = await ensureStagingCategory(supabase);
        const { data: existingMapping } = await supabase
          .from("product_mappings")
          .select("category_id")
          .eq("rivhit_item_id", itemId)
          .maybeSingle();
        const categoryChanged = existingMapping?.category_id !== staging.id;

        await supabase.from("product_mappings").upsert(
          {
            rivhit_item_id: itemId,
            category_id: staging.id,
            ...(categoryChanged ? { sort_order: 0 } : {}),
          },
          { onConflict: "rivhit_item_id" },
        );
        await supabase
          .from("product_label_assignments")
          .delete()
          .eq("rivhit_item_id", itemId);
      }
    }

    if (linkToItemId !== undefined) {
      const targetId = Number.parseInt(String(linkToItemId), 10);
      if (!Number.isFinite(targetId) || targetId <= 0) {
        return NextResponse.json({ error: "מזהה מוצר לא תקין" }, { status: 400 });
      }
      await linkVariantProducts(supabase, itemId, targetId);
    }

    if (unlinkVariant === true) {
      await unlinkVariantProduct(supabase, itemId);
    }

    if (sortOrder !== undefined) {
      const parsed =
        sortOrder === null || sortOrder === ""
          ? 0
          : Number.parseInt(String(sortOrder), 10);

      if (!Number.isFinite(parsed) || parsed < 0) {
        return NextResponse.json({ error: "מס סידור לא תקין" }, { status: 400 });
      }
      if (parsed > 0 && !Number.isInteger(parsed)) {
        return NextResponse.json({ error: "מס סידור חייב להיות מספר שלם" }, { status: 400 });
      }

      const { error: sortError } = await supabase
        .from("product_mappings")
        .update({ sort_order: parsed })
        .eq("rivhit_item_id", itemId);

      if (sortError) {
        return NextResponse.json({ error: sortError.message }, { status: 500 });
      }
    }

    if (labelIds !== undefined) {
      const ids = Array.isArray(labelIds)
        ? labelIds.filter((id): id is string => typeof id === "string")
        : [];

      const { data: mapping } = await supabase
        .from("product_mappings")
        .select("category_id")
        .eq("rivhit_item_id", itemId)
        .maybeSingle();

      if (!mapping?.category_id) {
        return NextResponse.json(
          { error: "יש לשייך מוצר לקטגוריה לפני תוויות" },
          { status: 400 },
        );
      }

      if (ids.length > 0) {
        const { data: validLabels } = await supabase
          .from("category_labels")
          .select("id")
          .eq("category_id", mapping.category_id)
          .in("id", ids);

        const validIds = new Set((validLabels ?? []).map((row) => row.id));
        const filtered = ids.filter((id) => validIds.has(id));

        await supabase
          .from("product_label_assignments")
          .delete()
          .eq("rivhit_item_id", itemId);

        if (filtered.length > 0) {
          const { error: assignError } = await supabase
            .from("product_label_assignments")
            .insert(
              filtered.map((labelId) => ({
                rivhit_item_id: itemId,
                label_id: labelId,
              })),
            );

          if (assignError) {
            return NextResponse.json({ error: assignError.message }, { status: 500 });
          }
        }
      } else {
        await supabase
          .from("product_label_assignments")
          .delete()
          .eq("rivhit_item_id", itemId);
      }
    }

    const { data: existingOverride } = await supabase
      .from("product_overrides")
      .select("custom_name, custom_price, custom_image, is_hidden, search_aliases")
      .eq("rivhit_item_id", itemId)
      .maybeSingle();

    const overridePayload = {
      rivhit_item_id: itemId,
      custom_name:
        customName !== undefined
          ? customName || null
          : (existingOverride?.custom_name ?? null),
      custom_price:
        customPrice !== undefined
          ? customPrice
          : (existingOverride?.custom_price ?? null),
      custom_image: clearCustomImage
        ? null
        : customImage !== undefined
          ? customImage || null
          : (existingOverride?.custom_image ?? null),
      is_hidden:
        isHidden !== undefined
          ? Boolean(isHidden)
          : (existingOverride?.is_hidden ?? false),
      search_aliases:
        searchAliases !== undefined
          ? String(searchAliases).trim() || null
          : (existingOverride?.search_aliases ?? null),
      updated_at: new Date().toISOString(),
    };

    const needsOverrideWrite =
      customName !== undefined ||
      customPrice !== undefined ||
      customImage !== undefined ||
      clearCustomImage ||
      isHidden !== undefined ||
      searchAliases !== undefined;

    if (needsOverrideWrite) {
      const { error } = await supabase
        .from("product_overrides")
        .upsert(overridePayload);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    revalidateTag(CATALOG_CACHE_TAG, "max");
    const savedAliases =
      searchAliases !== undefined
        ? String(searchAliases).trim() || ""
        : (existingOverride?.search_aliases ?? "");
    return NextResponse.json({ success: true, searchAliases: savedAliases });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בעדכון" },
      { status: 500 },
    );
  }
}
