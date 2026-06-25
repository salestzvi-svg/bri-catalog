import type { CatalogProduct } from "./types";

export interface VariantSearchProduct {
  itemId: number;
  sku: string;
  name: string;
  variantGroupId?: string | null;
  searchNames?: string[];
}

function normalizeSearchTerm(term: string) {
  return term.trim().toLowerCase();
}

function normalizeSkuForSearch(sku: string) {
  return sku.replace(/\s+/g, "").toLowerCase();
}

/** האם מילת החיפוש מתאימה למוצר (שם, מק״ט, או כל שם במשפחה) */
export function productMatchesSearch(
  product: VariantSearchProduct,
  term: string,
): boolean {
  const q = normalizeSearchTerm(term);
  if (!q) return true;

  const sku = product.sku.toLowerCase();
  const skuCompact = normalizeSkuForSearch(product.sku);
  const qCompact = normalizeSkuForSearch(q);
  if (sku.includes(q) || (qCompact.length >= 4 && skuCompact.includes(qCompact))) {
    return true;
  }

  const names = product.searchNames ?? [product.name];
  return names.some((name) => name.toLowerCase().includes(q));
}

/** מחזיר מוצרים שמתאימים לחיפוש, כולל כל אחים במשפחה */
export function filterProductsBySearch<T extends VariantSearchProduct>(
  products: T[],
  term: string,
): T[] {
  const q = normalizeSearchTerm(term);
  if (!q) return products;

  const matchedGroupIds = new Set<string>();
  const matchedStandaloneIds = new Set<number>();

  for (const product of products) {
    if (!productMatchesSearch(product, q)) continue;

    if (product.variantGroupId) {
      matchedGroupIds.add(product.variantGroupId);
    } else {
      matchedStandaloneIds.add(product.itemId);
    }
  }

  return products.filter((product) => {
    if (product.variantGroupId) {
      return matchedGroupIds.has(product.variantGroupId);
    }
    return matchedStandaloneIds.has(product.itemId);
  });
}

/**
 * חיפוש בתוך קטגוריה — אם נמצאה התאמה (בכל שפה), מציג את כל המשפחה
 * גם כשגרסאות שפה נמצאות בקטגוריות שונות אבל אחת מהן בקטגוריה הנוכחית.
 */
export function filterCategoryProductsBySearch<T extends VariantSearchProduct>(
  allProducts: T[],
  categoryProducts: T[],
  term: string,
): T[] {
  const q = normalizeSearchTerm(term);
  if (!q) return categoryProducts;

  const categoryIds = new Set(categoryProducts.map((p) => p.itemId));
  const matchedGroupIds = new Set<string>();
  const matchedStandaloneIds = new Set<number>();

  for (const product of allProducts) {
    if (!productMatchesSearch(product, q)) continue;

    if (product.variantGroupId) {
      const familyVisibleInCategory = allProducts.some(
        (p) =>
          p.variantGroupId === product.variantGroupId &&
          categoryIds.has(p.itemId),
      );
      if (familyVisibleInCategory) {
        matchedGroupIds.add(product.variantGroupId);
      }
    } else if (categoryIds.has(product.itemId)) {
      matchedStandaloneIds.add(product.itemId);
    }
  }

  const seen = new Set<number>();
  const result: T[] = [];

  for (const product of allProducts) {
    let include = false;
    if (
      product.variantGroupId &&
      matchedGroupIds.has(product.variantGroupId)
    ) {
      include = true;
    } else if (matchedStandaloneIds.has(product.itemId)) {
      include = true;
    }

    if (include && !seen.has(product.itemId)) {
      seen.add(product.itemId);
      result.push(product);
    }
  }

  return result;
}

export function enrichCatalogProductsWithVariants(
  products: CatalogProduct[],
): CatalogProduct[] {
  const byGroup = new Map<string, CatalogProduct[]>();

  for (const product of products) {
    if (!product.variantGroupId) continue;
    const list = byGroup.get(product.variantGroupId) ?? [];
    list.push(product);
    byGroup.set(product.variantGroupId, list);
  }

  return products.map((product) => {
    if (!product.variantGroupId) {
      return {
        ...product,
        searchNames: [product.name],
        variantItemIds: [product.itemId],
      };
    }

    const siblings = byGroup.get(product.variantGroupId) ?? [product];
    return {
      ...product,
      searchNames: siblings.map((s) => s.name),
      variantItemIds: siblings.map((s) => s.itemId),
    };
  });
}

export function findProductForFamilyLink<
  T extends { itemId: number; sku: string; name: string },
>(products: T[], currentItemId: number, query: string): T | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const q = trimmed.toLowerCase();
  const qSku = normalizeSkuForSearch(trimmed);
  const others = products.filter((p) => p.itemId !== currentItemId);

  const exactSku = others.find((p) => normalizeSkuForSearch(p.sku) === qSku);
  if (exactSku) return exactSku;

  const skuStarts = others.find((p) =>
    normalizeSkuForSearch(p.sku).startsWith(qSku),
  );
  if (skuStarts) return skuStarts;

  const skuIncludes = others.find((p) =>
    normalizeSkuForSearch(p.sku).includes(qSku),
  );
  if (skuIncludes) return skuIncludes;

  return others.find((p) => p.name.toLowerCase().includes(q)) ?? null;
}
