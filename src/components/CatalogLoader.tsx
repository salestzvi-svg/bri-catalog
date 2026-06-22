"use client";

import CatalogView from "@/components/CatalogView";
import AnnouncementPopup from "@/components/AnnouncementPopup";
import type { CatalogProduct, WhatsAppChannel } from "@/lib/types";
import { getWhatsAppNumber } from "@/lib/whatsapp";

export default function CatalogLoader({
  storeName,
  initialProducts,
  whatsappChannel = "default",
  initialError = "",
}: {
  storeName: string;
  initialProducts: CatalogProduct[];
  whatsappChannel?: WhatsAppChannel;
  initialError?: string;
}) {
  return (
    <>
      <AnnouncementPopup />
      {initialError && (
        <div className="bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          {initialError}
        </div>
      )}
      <CatalogView
        storeName={storeName}
        initialProducts={initialProducts}
        whatsappNumber={getWhatsAppNumber(whatsappChannel)}
        whatsappChannel={whatsappChannel}
      />
    </>
  );
}
