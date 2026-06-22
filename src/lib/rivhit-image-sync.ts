import type { SupabaseClient } from "@supabase/supabase-js";
import {
  clearRivhitItemsCache,
  fetchRivhitItems,
  resolveImageUrl,
} from "./rivhit";
import { uploadProductImageBuffer } from "./product-image-upload";

export async function syncProductImageFromRivhit(
  supabase: SupabaseClient,
  itemId: number,
): Promise<{ imageUrl: string } | { error: string }> {
  clearRivhitItemsCache();
  const items = await fetchRivhitItems();
  const item = items.find((row) => row.item_id === itemId);

  if (!item) {
    return { error: "מוצר לא נמצא בריווחית" };
  }

  const rivhitUrl = resolveImageUrl(item.picture_link);
  if (!rivhitUrl) {
    return { error: "אין תמונה בריווחית למוצר זה" };
  }

  const imageResponse = await fetch(rivhitUrl, { cache: "no-store" });
  if (!imageResponse.ok) {
    return { error: "לא ניתן להוריד את התמונה מריווחית" };
  }

  const contentType =
    imageResponse.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await imageResponse.arrayBuffer());

  return uploadProductImageBuffer(supabase, itemId, buffer, contentType);
}
