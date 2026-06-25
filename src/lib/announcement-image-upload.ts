import type { SupabaseClient } from "@supabase/supabase-js";

export const ANNOUNCEMENTS_BUCKET = "announcements";
export const ANNOUNCEMENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const ANNOUNCEMENT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function ensureAnnouncementsBucket(supabase: SupabaseClient) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((bucket) => bucket.id === ANNOUNCEMENTS_BUCKET)) {
    return;
  }

  const { error } = await supabase.storage.createBucket(ANNOUNCEMENTS_BUCKET, {
    public: true,
    fileSizeLimit: ANNOUNCEMENT_IMAGE_MAX_BYTES,
    allowedMimeTypes: [...ANNOUNCEMENT_IMAGE_TYPES],
  });

  if (error && !error.message.includes("already exists")) {
    throw new Error(error.message);
  }
}
