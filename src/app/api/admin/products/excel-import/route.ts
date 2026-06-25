import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdminSession } from "@/lib/auth";
import { CATALOG_CACHE_TAG } from "@/lib/catalog";
import { clearRivhitItemsCache, fetchRivhitItems } from "@/lib/rivhit";
import { createAdminClient } from "@/lib/supabase/server";
import { importProductsFromExcel } from "@/lib/excel-product-import";
import { ensureProductImagesBucket } from "@/lib/product-image-upload";

const MAX_EXCEL_BYTES = 25 * 1024 * 1024;

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

  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx")) {
    return NextResponse.json(
      { error: "יש להעלות קובץ Excel בפורמט .xlsx" },
      { status: 400 },
    );
  }

  if (file.size > MAX_EXCEL_BYTES) {
    return NextResponse.json(
      { error: "הקובץ גדול מדי (מקסימום 25MB)" },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    clearRivhitItemsCache();
    const rivhitItems = await fetchRivhitItems();
    const supabase = createAdminClient();
    await ensureProductImagesBucket(supabase);
    const result = await importProductsFromExcel(
      supabase,
      buffer,
      rivhitItems,
    );

    if (result.imported > 0 || result.imagesUploaded > 0) {
      revalidateTag(CATALOG_CACHE_TAG, "max");
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "שגיאה בייבוא קובץ האקסל",
      },
      { status: 500 },
    );
  }
}
