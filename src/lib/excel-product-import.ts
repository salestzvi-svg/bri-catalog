import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RivhitItem } from "./types";
import { getSku } from "./rivhit";
import {
  PRODUCT_IMAGE_MAX_BYTES,
  uploadProductImageBuffer,
} from "./product-image-upload";

export interface ExcelImportRow {
  excelRow: number;
  rivhitItemId: number | null;
  name: string;
  sku: string;
  price: number | null;
  imageBuffer: Buffer | null;
  imageContentType: string | null;
}

export interface ExcelImportResult {
  totalRows: number;
  imported: number;
  imagesUploaded: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim();
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }
    if ("result" in value && value.result != null) {
      return String(value.result).trim();
    }
  }
  return String(value).trim();
}

function cellNumber(value: ExcelJS.CellValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = cellText(value).replace(/,/g, ".");
  if (!text) return null;
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function cellItemId(value: ExcelJS.CellValue): number | null {
  const num = cellNumber(value);
  if (num != null && num > 0 && Number.isInteger(num)) return num;
  const text = cellText(value);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeSku(value: string): string {
  return sanitizeImportText(value).replace(/\s+/g, "").toLowerCase();
}

/** מנקה תווים שגורמים לשגיאות ב-PostgreSQL (כולל escape sequences) */
export function sanitizeImportText(value: string): string {
  return value
    .replace(/\0/g, "")
    .replace(/\\/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

function extensionToContentType(ext: string): string {
  const lower = ext.toLowerCase().replace(/^\./, "");
  if (lower === "png") return "image/png";
  if (lower === "gif") return "image/gif";
  if (lower === "webp") return "image/webp";
  return "image/jpeg";
}

export async function parseExcelProductFile(
  buffer: Buffer,
): Promise<ExcelImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("לא נמצא גיליון באקסל");
  }

  const imagesByRow = new Map<
    number,
    { buffer: Buffer; contentType: string }
  >();

  for (const image of worksheet.getImages()) {
    const col = image.range.tl.nativeCol;
    const row = image.range.tl.nativeRow + 1;
    if (col !== 1) continue;

    const imageData = workbook.getImage(Number(image.imageId));
    if (!imageData?.buffer) continue;

    const contentType = extensionToContentType(imageData.extension ?? "jpeg");
    imagesByRow.set(row, {
      buffer: Buffer.from(imageData.buffer),
      contentType,
    });
  }

  const rows: ExcelImportRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const rivhitItemId = cellItemId(row.getCell(1).value);
    const name = sanitizeImportText(cellText(row.getCell(3).value));
    const sku = sanitizeImportText(cellText(row.getCell(4).value));
    const price = cellNumber(row.getCell(5).value);
    const image = imagesByRow.get(rowNumber) ?? null;

    if (!rivhitItemId && !sku && !name && !image) return;

    rows.push({
      excelRow: rowNumber,
      rivhitItemId,
      name,
      sku,
      price,
      imageBuffer: image?.buffer ?? null,
      imageContentType: image?.contentType ?? null,
    });
  });

  return rows;
}

function findRivhitItem(
  row: ExcelImportRow,
  byId: Map<number, RivhitItem>,
  bySku: Map<string, RivhitItem>,
): RivhitItem | null {
  if (row.rivhitItemId != null) {
    const byItemId = byId.get(row.rivhitItemId);
    if (byItemId) return byItemId;
  }

  if (row.sku) {
    const normalized = normalizeSku(row.sku);
    const bySkuMatch = bySku.get(normalized);
    if (bySkuMatch) return bySkuMatch;
  }

  return null;
}

async function upsertProductOverride(
  supabase: SupabaseClient,
  itemId: number,
  fields: {
    customName?: string | null;
    customPrice?: number | null;
    customImage?: string | null;
  },
): Promise<{ error: string } | { success: true }> {
  const { data: existing } = await supabase
    .from("product_overrides")
    .select("custom_name, custom_price, custom_image, is_hidden")
    .eq("rivhit_item_id", itemId)
    .maybeSingle();

  const { error } = await supabase.from("product_overrides").upsert({
    rivhit_item_id: itemId,
    custom_name:
      fields.customName !== undefined
        ? fields.customName || null
        : (existing?.custom_name ?? null),
    custom_price:
      fields.customPrice !== undefined
        ? fields.customPrice
        : (existing?.custom_price ?? null),
    custom_image:
      fields.customImage !== undefined
        ? fields.customImage || null
        : (existing?.custom_image ?? null),
    is_hidden: existing?.is_hidden ?? false,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function importProductsFromExcel(
  supabase: SupabaseClient,
  buffer: Buffer,
  rivhitItems: RivhitItem[],
): Promise<ExcelImportResult> {
  const rows = await parseExcelProductFile(buffer);

  const byId = new Map(rivhitItems.map((item) => [item.item_id, item]));
  const bySku = new Map<string, RivhitItem>();

  for (const item of rivhitItems) {
    const sku = normalizeSku(getSku(item));
    if (sku) bySku.set(sku, item);
    if (item.barcode) {
      bySku.set(normalizeSku(item.barcode), item);
    }
    if (item.item_part_num) {
      bySku.set(normalizeSku(item.item_part_num), item);
    }
  }

  const result: ExcelImportResult = {
    totalRows: rows.length,
    imported: 0,
    imagesUploaded: 0,
    skipped: 0,
    errors: [],
  };

  for (const row of rows) {
    const item = findRivhitItem(row, byId, bySku);
    if (!item) {
      result.skipped += 1;
      result.errors.push({
        row: row.excelRow,
        message: `מוצר לא נמצא בריווחית (מס׳ ${row.rivhitItemId ?? "—"}, מקט ${row.sku || "—"})`,
      });
      continue;
    }

    const rowErrors: string[] = [];
    let customImage: string | null | undefined;

    if (row.imageBuffer && row.imageContentType) {
      if (row.imageBuffer.byteLength > PRODUCT_IMAGE_MAX_BYTES) {
        rowErrors.push(`תמונה גדולה מדי למוצר ${item.item_id}`);
      } else {
        const upload = await uploadProductImageBuffer(
          supabase,
          item.item_id,
          row.imageBuffer,
          row.imageContentType,
        );
        if ("error" in upload) {
          rowErrors.push(`שגיאה בהעלאת תמונה: ${upload.error}`);
        } else {
          customImage = upload.imageUrl;
          result.imagesUploaded += 1;
        }
      }
    }

    const hasMetaUpdate = Boolean(row.name) || row.price != null;
    if (!hasMetaUpdate && customImage === undefined) {
      if (rowErrors.length === 0) {
        rowErrors.push("אין תמונה, שם או מחיר לעדכון");
      }
      result.errors.push({
        row: row.excelRow,
        message: rowErrors.join(" | "),
      });
      continue;
    }

    const save = await upsertProductOverride(supabase, item.item_id, {
      customName: row.name || undefined,
      customPrice: row.price ?? undefined,
      customImage,
    });

    if ("error" in save) {
      rowErrors.push(save.error);
      result.errors.push({
        row: row.excelRow,
        message: rowErrors.join(" | "),
      });
      continue;
    }

    result.imported += 1;
    if (rowErrors.length > 0) {
      result.errors.push({
        row: row.excelRow,
        message: rowErrors.join(" | "),
      });
    }
  }

  return result;
}
