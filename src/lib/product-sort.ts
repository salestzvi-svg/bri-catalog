import type { CatalogProduct } from "./types";

export function compareSku(a: string, b: string) {
  const numA = Number.parseInt(a, 10);
  const numB = Number.parseInt(b, 10);
  if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
  return a.localeCompare(b, "he", { numeric: true });
}

/** 0 = ללא מספר; 1+ = מיקום מפורש בתוך הקטגוריה */
export function hasProductSortNumber(sortOrder: number | null | undefined) {
  return (sortOrder ?? 0) > 0;
}

/** בתוך קטגוריה: ממוספרים (1,2,3…) קודם, אחר כך ללא מספר לפי מק״ט */
export function compareProducts(
  a: Pick<CatalogProduct, "sortOrder" | "sku">,
  b: Pick<CatalogProduct, "sortOrder" | "sku">,
) {
  const aSort = a.sortOrder ?? 0;
  const bSort = b.sortOrder ?? 0;
  const aOrdered = hasProductSortNumber(aSort);
  const bOrdered = hasProductSortNumber(bSort);

  if (aOrdered && bOrdered) {
    if (aSort !== bSort) return aSort - bSort;
    return compareSku(a.sku, b.sku);
  }
  if (aOrdered !== bOrdered) return aOrdered ? -1 : 1;
  return compareSku(a.sku, b.sku);
}
