import { redirect } from "next/navigation";
import CatalogLoader from "@/components/CatalogLoader";
import { requireStoreSession } from "@/lib/auth";
import { getCachedCatalogProducts } from "@/lib/catalog";
import type { CatalogProduct, WhatsAppChannel } from "@/lib/types";

export default async function CatalogPage() {
  const session = await requireStoreSession();
  if (!session) {
    redirect("/login");
  }

  let products: CatalogProduct[] = [];
  let loadError = "";

  try {
    products = await getCachedCatalogProducts();
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "שגיאה בטעינת הקטלוג";
  }

  return (
    <CatalogLoader
      storeName={session.storeName ?? "חנות"}
      initialProducts={products}
      whatsappChannel={(session.whatsappChannel ?? "default") as WhatsAppChannel}
      initialError={loadError}
    />
  );
}
