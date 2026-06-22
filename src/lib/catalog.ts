import { unstable_cache } from "next/cache";
import { createAdminClient } from "./supabase/server";
import { fetchAllRows } from "./supabase/fetch-all";
import { fetchRivhitItems, getSku, resolveProductImage, clearRivhitItemsCache } from "./rivhit";
import type { CatalogProduct, Category, ProductOverride, WhatsAppChannel } from "./types";
import { buildWhatsAppOrderUrl as buildWaUrl, getWhatsAppNumber } from "./whatsapp";

export const CATALOG_CACHE_TAG = "catalog-products";

function compareSku(a: string, b: string) {
  const numA = Number.parseInt(a, 10);
  const numB = Number.parseInt(b, 10);
  if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
  return a.localeCompare(b, "he", { numeric: true });
}

export async function getCategories(options?: {
  includeStaging?: boolean;
}): Promise<Category[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, sort_order, is_staging")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  const categories = (data ?? []) as Category[];
  if (options?.includeStaging) {
    return categories;
  }
  return categories.filter((c) => !c.is_staging);
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

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const [items, categories, overrides, mappings] = await Promise.all([
    fetchRivhitItems(),
    getCategories(),
    getOverridesMap(),
    fetchAllRows<{ rivhit_item_id: number; category_id: string; sort_order: number }>(
      createAdminClient(),
      "product_mappings",
      "rivhit_item_id, category_id, sort_order",
    ),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const mappingByItem = new Map<
    number,
    { category_id: string; sort_order: number }
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
    });
  }

  products.sort((a, b) => {
    if (a.categorySortOrder !== b.categorySortOrder) {
      return a.categorySortOrder - b.categorySortOrder;
    }
    return compareSku(a.sku, b.sku);
  });

  return products;
}

export const getCachedCatalogProducts = unstable_cache(
  async () => getCatalogProducts(),
  ["catalog-products-v3"],
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
