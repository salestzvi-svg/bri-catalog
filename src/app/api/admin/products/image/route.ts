import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth";
import { CATALOG_CACHE_TAG } from "@/lib/catalog";
import {
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_TYPES,
  saveProductCustomImage,
  uploadProductImageBuffer,
} from "@/lib/product-image-upload";

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const itemId = Number(formData.get("itemId"));

  if (!Number.isFinite(itemId) || itemId <= 0) {
    return NextResponse.json({ error: "מזהה מוצר לא תקין" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
  }

  if (!PRODUCT_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "סוג קובץ לא נתמך. העלה JPG, PNG, WEBP או GIF" },
      { status: 400 },
    );
  }

  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return NextResponse.json(
      { error: "התמונה גדולה מדי (מקסימום 5MB)" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = createAdminClient();

  const uploadResult = await uploadProductImageBuffer(
    supabase,
    itemId,
    buffer,
    file.type,
  );

  if ("error" in uploadResult) {
    return NextResponse.json({ error: uploadResult.error }, { status: 500 });
  }

  const saveResult = await saveProductCustomImage(
    supabase,
    itemId,
    uploadResult.imageUrl,
  );

  if ("error" in saveResult) {
    return NextResponse.json({ error: saveResult.error }, { status: 500 });
  }

  revalidateTag(CATALOG_CACHE_TAG, "max");
  return NextResponse.json({ success: true, imageUrl: uploadResult.imageUrl });
}
