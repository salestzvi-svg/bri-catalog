"use client";

import CatalogView from "@/components/CatalogView";
import AnnouncementPopup from "@/components/AnnouncementPopup";
import { useStoreLocale } from "@/hooks/useStoreLocale";
import type { CatalogProduct, Category, CategoryLabel, WhatsAppChannel } from "@/lib/types";
import type { StorePricingContext } from "@/lib/store-pricing";
import { getWhatsAppNumber } from "@/lib/whatsapp";

export default function CatalogLoader({
  storeName,
  initialProducts,
  initialCategories,
  initialCategoryLabels = [],
  whatsappChannel = "default",
  initialError = "",
  storePricing,
}: {
  storeName: string;
  initialProducts: CatalogProduct[];
  initialCategories: Category[];
  initialCategoryLabels?: CategoryLabel[];
  whatsappChannel?: WhatsAppChannel;
  initialError?: string;
  storePricing: StorePricingContext;
}) {
  const { t, dir, locale, toggleLocale } = useStoreLocale();

  return (
    <div dir={dir} lang={locale}>
      <AnnouncementPopup />
      {initialError && (
        <div className="bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          {initialError}
        </div>
      )}
      <CatalogView
        storeName={storeName}
        initialProducts={initialProducts}
        initialCategories={initialCategories}
        initialCategoryLabels={initialCategoryLabels}
        whatsappNumber={getWhatsAppNumber(whatsappChannel)}
        whatsappChannel={whatsappChannel}
        discountPercent={storePricing.discountPercent}
        storePricing={storePricing}
        t={t}
        locale={locale}
        onToggleLocale={toggleLocale}
      />
    </div>
  );
}
