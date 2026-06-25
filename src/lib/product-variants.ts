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

/** האם מילת החיפוש מתאימה למוצר (שם, מק״ט, או כל שם במשפחה) */
export function productMatchesSearch(
  product: VariantSearchProduct,
  term: string,
): boolean {
  const q = normalizeSearchTerm(term);
  if (!q) return true;

  if (product.sku.toLowerCase().includes(q)) return true;

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
