/** קטגוריית ניהול פנימית — מוצרים משויכים אליה לא מוצגים ללקוחות */
export const ADMIN_CATALOG_CATEGORY_NAME = "כל המוצרים";

export function isAdminCatalogCategory(category: { name: string }): boolean {
  return category.name.trim() === ADMIN_CATALOG_CATEGORY_NAME;
}

export function isStorefrontCategory(category: {
  name: string;
  is_staging?: boolean;
}): boolean {
  return !category.is_staging && !isAdminCatalogCategory(category);
}

/** קטגוריות שהמנהל רואה בניהול (לא כולל staging ולא את כל המוצרים) */
export function isManagedCategory(category: {
  name: string;
  is_staging?: boolean;
}): boolean {
  return !category.is_staging && !isAdminCatalogCategory(category);
}
