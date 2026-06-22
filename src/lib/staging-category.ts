import type { SupabaseClient } from "@supabase/supabase-js";

export const STAGING_CATEGORY_NAME = "מוצרים חדשים";

export interface StagingCategory {
  id: string;
  name: string;
  sort_order: number;
  is_staging: boolean;
}

export async function ensureStagingCategory(
  supabase: SupabaseClient,
): Promise<StagingCategory> {
  const { data: existing, error: lookupError } = await supabase
    .from("categories")
    .select("id, name, sort_order, is_staging")
    .eq("is_staging", true)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (existing) {
    return existing as StagingCategory;
  }

  const { data: created, error: createError } = await supabase
    .from("categories")
    .insert({
      name: STAGING_CATEGORY_NAME,
      sort_order: -1,
      is_staging: true,
    })
    .select("id, name, sort_order, is_staging")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return created as StagingCategory;
}

export async function syncNewItemsToStagingCategory(
  supabase: SupabaseClient,
  stagingCategoryId: string,
  rivhitItemIds: number[],
  mappedItemIds: Set<number>,
) {
  const toAssign = rivhitItemIds.filter((id) => !mappedItemIds.has(id));
  if (toAssign.length === 0) return 0;

  const rows = toAssign.map((rivhit_item_id) => ({
    rivhit_item_id,
    category_id: stagingCategoryId,
  }));

  const { error } = await supabase
    .from("product_mappings")
    .upsert(rows, { onConflict: "rivhit_item_id" });

  if (error) {
    throw new Error(error.message);
  }

  return toAssign.length;
}
