import type { SupabaseClient } from "@supabase/supabase-js";

export const PRODUCT_IMAGES_BUCKET = "product-images";
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extensionFromContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

export async function uploadProductImageBuffer(
  supabase: SupabaseClient,
  itemId: number,
  buffer: Buffer,
  contentType: string,
): Promise<{ imageUrl: string } | { error: string }> {
  if (buffer.byteLength === 0) {
    return { error: "הקובץ ריק" };
  }

  if (buffer.byteLength > PRODUCT_IMAGE_MAX_BYTES) {
    return { error: "התמונה גדולה מדי (מקסימום 5MB)" };
  }

  const ext = extensionFromContentType(contentType);
  const path = `${itemId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    const hint =
      uploadError.message.includes("Bucket not found") ||
      uploadError.message.includes("bucket")
        ? " — הרץ את migration-add-product-images.sql ב-Supabase"
        : "";
    return { error: `${uploadError.message}${hint}` };
  }

  const { data: urlData } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(path);

  return { imageUrl: urlData.publicUrl };
}

export async function saveProductCustomImage(
  supabase: SupabaseClient,
  itemId: number,
  imageUrl: string,
): Promise<{ error: string } | { success: true }> {
  const { data: existingOverride } = await supabase
    .from("product_overrides")
    .select("custom_name, custom_price, is_hidden")
    .eq("rivhit_item_id", itemId)
    .maybeSingle();

  const { error } = await supabase.from("product_overrides").upsert({
    rivhit_item_id: itemId,
    custom_name: existingOverride?.custom_name ?? null,
    custom_price: existingOverride?.custom_price ?? null,
    custom_image: imageUrl,
    is_hidden: existingOverride?.is_hidden ?? false,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
