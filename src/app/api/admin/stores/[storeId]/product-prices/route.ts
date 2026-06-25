import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getCachedCatalogProducts } from "@/lib/catalog";
import { createAdminClient } from "@/lib/supabase/server";
import type { StoreProductPriceRow } from "@/lib/store-pricing";

function parseCustomPrice(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

async function buildPriceRows(storeId: string): Promise<{
  prices: StoreProductPriceRow[];
  discountAppliesToCustomPrices: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();

  const [storeResult, pricesResult, products] = await Promise.all([
    supabase
      .from("stores")
      .select("discount_applies_to_custom_prices")
      .eq("id", storeId)
      .maybeSingle(),
    supabase
      .from("store_product_prices")
      .select("rivhit_item_id, custom_price")
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false }),
    getCachedCatalogProducts(),
  ]);

  if (storeResult.error) {
    return {
      prices: [],
      discountAppliesToCustomPrices: false,
      error: storeResult.error.message,
    };
  }

  if (pricesResult.error) {
    if (/store_product_prices/i.test(pricesResult.error.message)) {
      return {
        prices: [],
        discountAppliesToCustomPrices: Boolean(
          storeResult.data?.discount_applies_to_custom_prices,
        ),
        error:
          "טבלת מחירי מוצרים לחנות חסרה — הרץ את migration-store-product-prices.sql",
      };
    }
    return {
      prices: [],
      discountAppliesToCustomPrices: false,
      error: pricesResult.error.message,
    };
  }

  const productById = new Map(products.map((p) => [p.itemId, p]));
  const prices: StoreProductPriceRow[] = [];

  for (const row of pricesResult.data ?? []) {
    const itemId = Number(row.rivhit_item_id);
    const customPrice = Number(row.custom_price);
    const product = productById.get(itemId);
    if (!product || !Number.isFinite(customPrice)) continue;

    prices.push({
      itemId,
      sku: product.sku,
      name: product.name,
      catalogPrice: product.price,
      customPrice,
    });
  }

  return {
    prices,
    discountAppliesToCustomPrices: Boolean(
      storeResult.data?.discount_applies_to_custom_prices,
    ),
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ storeId: string }> },
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { storeId } = await context.params;
  const result = await buildPriceRows(storeId);

  if (result.error && result.prices.length === 0) {
    const status = /חסרה/.test(result.error) ? 503 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    prices: result.prices,
    discountAppliesToCustomPrices: result.discountAppliesToCustomPrices,
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ storeId: string }> },
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { storeId } = await context.params;
  const body = await request.json();
  const itemId = Number(body.itemId);
  const customPrice = parseCustomPrice(body.customPrice);

  if (!Number.isFinite(itemId) || itemId <= 0) {
    return NextResponse.json({ error: "מזהה מוצר לא תקין" }, { status: 400 });
  }

  if (customPrice === null) {
    return NextResponse.json({ error: "מחיר לא תקין" }, { status: 400 });
  }

  const products = await getCachedCatalogProducts();
  const product = products.find((p) => p.itemId === itemId);
  if (!product) {
    return NextResponse.json({ error: "מוצר לא נמצא בקטלוג" }, { status: 404 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("store_product_prices").upsert(
    {
      store_id: storeId,
      rivhit_item_id: itemId,
      custom_price: customPrice,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id,rivhit_item_id" },
  );

  if (error) {
    if (/store_product_prices/i.test(error.message)) {
      return NextResponse.json(
        {
          error:
            "טבלת מחירי מוצרים לחנות חסרה — הרץ את migration-store-product-prices.sql",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    price: {
      itemId,
      sku: product.sku,
      name: product.name,
      catalogPrice: product.price,
      customPrice,
    },
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ storeId: string }> },
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { storeId } = await context.params;
  const body = await request.json();
  const itemId = Number(body.itemId);

  if (!Number.isFinite(itemId) || itemId <= 0) {
    return NextResponse.json({ error: "מזהה מוצר לא תקין" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("store_product_prices")
    .delete()
    .eq("store_id", storeId)
    .eq("rivhit_item_id", itemId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
