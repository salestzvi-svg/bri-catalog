import { unstable_cache } from "next/cache";
import { createAdminClient } from "./supabase/server";
import { fetchAllRows } from "./supabase/fetch-all";
import { fetchRivhitItems, getSku, resolveProductImage, clearRivhitItemsCache } from "./rivhit";
import type { CatalogProduct, Category, CategoryLabel, ProductOverride, WhatsAppChannel } from "./types";
import { buildWhatsAppOrderUrl as buildWaUrl, getWhatsAppNumber } from "./whatsapp";
import { isStorefrontCategory } from "./storefront-categories";
import { compareProducts } from "./product-sort";
import { enrichCatalogProductsWithVariants } from "./product-variants";

export const CATALOG_CACHE_TAG = "catalog-products";

export async function getCategories(options?: {
  includeStaging?: boolean;
  storefrontOnly?: boolean;
}): Promise<Category[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, sort_order, is_staging")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  let categories = (data ?? []) as Category[];
  if (!options?.includeStaging) {
    categories = categories.filter((c) => !c.is_staging);
  }
  if (options?.storefrontOnly) {
    categories = categories.filter((c) => isStorefrontCategory(c));
  }
  return categories;
}

export async function getOverridesMap(): Promise<Map<number, ProductOverride>> {
  const supabase = createAdminClient();
  const data = await fetchAllRows<ProductOverride>(
    supabase,
    "product_overrides",
  );

  const map = new Map<number, ProductOverride>();
  for (const row of data) {
    map.set(row.rivhit_item_id, row);
  }
  return map;
}

async function getLabelAssignmentsMap(): Promise<Map<number, string[]>> {
  const supabase = createAdminClient();
  let rows: { rivhit_item_id: number; label_id: string }[];
  try {
    rows = await fetchAllRows<{ rivhit_item_id: number; label_id: string }>(
      supabase,
      "product_label_assignments",
      "rivhit_item_id, label_id",
    );
  } catch {
    return new Map();
  }

  const map = new Map<number, string[]>();
  for (const row of rows) {
    const list = map.get(row.rivhit_item_id) ?? [];
    list.push(row.label_id);
    map.set(row.rivhit_item_id, list);
  }
  return map;
}

export async function getCategoryLabels(): Promise<CategoryLabel[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("category_labels")
    .select("id, category_id, name, sort_order")
    .order("sort_order", { ascending: true });

  if (error) return [];
  return (data ?? []) as CategoryLabel[];
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const [items, categories, overrides, mappings, labelAssignments] =
    await Promise.all([
      fetchRivhitItems(),
      getCategories({ storefrontOnly: true }),
      getOverridesMap(),
      fetchAllRows<{
        rivhit_item_id: number;
        category_id: string;
        sort_order: number;
        variant_group_id: string | null;
      }>(
        createAdminClient(),
        "product_mappings",
        "rivhit_item_id, category_id, sort_order, variant_group_id",
      ),
      getLabelAssignmentsMap(),
    ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const mappingByItem = new Map<
    number,
    { category_id: string; sort_order: number; variant_group_id: string | null }
  >();

  for (const mapping of mappings) {
    mappingByItem.set(mapping.rivhit_item_id, mapping);
  }

  const products: CatalogProduct[] = [];

  for (const item of items) {
    const override = overrides.get(item.item_id);
    if (override?.is_hidden) continue;

    const mapping = mappingByItem.get(item.item_id);
    if (!mapping) continue;

    const category = categoryMap.get(mapping.category_id);
    if (!category) continue;

    const sku = getSku(item);
    if (!sku) continue;

    products.push({
      itemId: item.item_id,
      sku,
      name: override?.custom_name || item.item_name,
      price: override?.custom_price ?? item.sale_nis,
      image: resolveProductImage(item.picture_link, override),
      categoryId: category.id,
      categoryName: category.name,
      categorySortOrder: category.sort_order,
      sortOrder: mapping.sort_order ?? 0,
      labelIds: labelAssignments.get(item.item_id) ?? [],
      variantGroupId: mapping.variant_group_id ?? null,
    });
  }

  const enriched = enrichCatalogProductsWithVariants(products);

  enriched.sort((a, b) => {
    if (a.categorySortOrder !== b.categorySortOrder) {
      return a.categorySortOrder - b.categorySortOrder;
    }
    return compareProducts(a, b);
  });

  return enriched;
}

export const getCachedCatalogProducts = unstable_cache(
  async () => getCatalogProducts(),
  ["catalog-products-v7"],
  { revalidate: 300, tags: [CATALOG_CACHE_TAG] },
);

export const getCachedStorefrontCategories = unstable_cache(
  async () => getCategories({ storefrontOnly: true }),
  ["storefront-categories-v1"],
  { revalidate: 300, tags: [CATALOG_CACHE_TAG] },
);

export const getCachedCategoryLabels = unstable_cache(
  async () => getCategoryLabels(),
  ["category-labels-v1"],
  { revalidate: 300, tags: [CATALOG_CACHE_TAG] },
);

export function buildWhatsAppOrderUrl(
  storeName: string,
  items: { sku: string; quantity: number }[],
  notes?: string,
  channel?: WhatsAppChannel | null,
) {
  return buildWaUrl(getWhatsAppNumber(channel), storeName, items, notes);
}

export { clearRivhitItemsCache };
