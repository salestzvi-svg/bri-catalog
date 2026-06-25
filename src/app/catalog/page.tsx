import { redirect } from "next/navigation";
import CatalogLoader from "@/components/CatalogLoader";
import { createAdminClient } from "@/lib/supabase/server";
import { requireStoreSession } from "@/lib/auth";
import { getCachedCatalogProducts, getCachedStorefrontCategories, getCachedCategoryLabels } from "@/lib/catalog";
import {
  emptyStorePricingContext,
  loadStorePricingContext,
} from "@/lib/store-pricing";
import type { CatalogProduct, Category, CategoryLabel, WhatsAppChannel } from "@/lib/types";

export default async function CatalogPage() {
  const session = await requireStoreSession();
  if (!session) {
    redirect("/login");
  }

  let products: CatalogProduct[] = [];
  let categories: Category[] = [];
  let categoryLabels: CategoryLabel[] = [];
  let loadError = "";
  let storePricing = emptyStorePricingContext();

  try {
    [products, categories, categoryLabels] = await Promise.all([
      getCachedCatalogProducts(),
      getCachedStorefrontCategories(),
      getCachedCategoryLabels(),
    ]);
    if (session.storeId) {
      const supabase = createAdminClient();
      storePricing = await loadStorePricingContext(supabase, session.storeId);
    }
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "שגיאה בטעינת הקטלוג";
  }

  return (
    <CatalogLoader
      storeName={session.storeName ?? "חנות"}
      initialProducts={products}
      initialCategories={categories}
      initialCategoryLabels={categoryLabels}
      whatsappChannel={(session.whatsappChannel ?? "default") as WhatsAppChannel}
      initialError={loadError}
      storePricing={storePricing}
    />
  );
}
