import type { CatalogProduct } from "./types";

/** שמות נסתרים לחיפוש — שורה אחת לכל שם, או מופרדים בפסיק */
export function parseSearchAliases(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(/[\n,]+/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}

export function formatSearchAliases(aliases: string[]): string {
  return aliases.join("\n");
}

/** מוסיף שמות חיפוש נסתרים ל-searchNames (כולל במשפחות) */
export function applySearchAliasesToCatalog<T extends CatalogProduct>(
  products: T[],
  aliasByItemId: Map<number, string[]>,
): T[] {
  return products.map((product) => {
    const names = new Set<string>(product.searchNames ?? [product.name]);

    for (const alias of aliasByItemId.get(product.itemId) ?? []) {
      names.add(alias);
    }

    if (product.variantGroupId) {
      for (const member of products) {
        if (member.variantGroupId !== product.variantGroupId) continue;
        for (const alias of aliasByItemId.get(member.itemId) ?? []) {
          names.add(alias);
        }
      }
    }

    return { ...product, searchNames: [...names] };
  });
}
