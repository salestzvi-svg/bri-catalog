import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth";
import {
  ANNOUNCEMENT_IMAGE_MAX_BYTES,
  ANNOUNCEMENT_IMAGE_TYPES,
  ANNOUNCEMENTS_BUCKET,
  ensureAnnouncementsBucket,
} from "@/lib/announcement-image-upload";

const MAX_BYTES = ANNOUNCEMENT_IMAGE_MAX_BYTES;
const ALLOWED_TYPES = ANNOUNCEMENT_IMAGE_TYPES;

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "סוג קובץ לא נתמך. העלה JPG, PNG, WEBP או GIF" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "הקובץ גדול מדי (מקסימום 5MB)" },
      { status: 400 },
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `announcement-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = createAdminClient();

  try {
    await ensureAnnouncementsBucket(supabase);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "שגיאה ביצירת אחסון תמונות";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { error: uploadError } = await supabase.storage
    .from(ANNOUNCEMENTS_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    const hint =
      uploadError.message.includes("Bucket not found") ||
      uploadError.message.includes("bucket")
        ? " — הרץ את migration-add-announcements.sql ב-Supabase"
        : "";
    return NextResponse.json(
      { error: `${uploadError.message}${hint}` },
      { status: 500 },
    );
  }

  const { data: urlData } = supabase.storage
    .from(ANNOUNCEMENTS_BUCKET)
    .getPublicUrl(path);

  return NextResponse.json({ imageUrl: urlData.publicUrl });
}
