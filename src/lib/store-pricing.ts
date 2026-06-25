import type { SupabaseClient } from "@supabase/supabase-js";
import { applyDiscount } from "@/lib/i18n/store-ui";

export interface StorePricingContext {
  discountPercent: number;
  discountAppliesToCustomPrices: boolean;
  customPricesByItemId: Record<number, number>;
}

export interface ResolvedStorePrice {
  unitPrice: number;
  compareAtPrice: number;
  showStrike: boolean;
}

export interface StoreProductPriceRow {
  itemId: number;
  sku: string;
  name: string;
  catalogPrice: number;
  customPrice: number;
}

export function emptyStorePricingContext(): StorePricingContext {
  return {
    discountPercent: 0,
    discountAppliesToCustomPrices: false,
    customPricesByItemId: {},
  };
}

export function resolveStoreUnitPrice(
  catalogPrice: number,
  itemId: number,
  ctx: StorePricingContext,
): ResolvedStorePrice {
  if (!catalogPrice || catalogPrice <= 0) {
    return {
      unitPrice: catalogPrice,
      compareAtPrice: catalogPrice,
      showStrike: false,
    };
  }

  const custom = ctx.customPricesByItemId[itemId];
  const hasCustom = custom != null && custom > 0;

  if (hasCustom) {
    if (ctx.discountAppliesToCustomPrices && ctx.discountPercent > 0) {
      const unitPrice = applyDiscount(custom, ctx.discountPercent);
      return {
        unitPrice,
        compareAtPrice: custom,
        showStrike: unitPrice < custom,
      };
    }

    return {
      unitPrice: custom,
      compareAtPrice: catalogPrice,
      showStrike: custom < catalogPrice,
    };
  }

  const unitPrice = applyDiscount(catalogPrice, ctx.discountPercent);
  return {
    unitPrice,
    compareAtPrice: catalogPrice,
    showStrike: ctx.discountPercent > 0 && unitPrice < catalogPrice,
  };
}

export async function loadStorePricingContext(
  supabase: SupabaseClient,
  storeId: string,
): Promise<StorePricingContext> {
  const [storeResult, pricesResult] = await Promise.all([
    supabase
      .from("stores")
      .select("discount_percent, discount_applies_to_custom_prices")
      .eq("id", storeId)
      .maybeSingle(),
    supabase
      .from("store_product_prices")
      .select("rivhit_item_id, custom_price")
      .eq("store_id", storeId),
  ]);

  const customPricesByItemId: Record<number, number> = {};
  if (!pricesResult.error) {
    for (const row of pricesResult.data ?? []) {
      const itemId = Number(row.rivhit_item_id);
      const price = Number(row.custom_price);
      if (Number.isFinite(itemId) && Number.isFinite(price) && price > 0) {
        customPricesByItemId[itemId] = price;
      }
    }
  }

  return {
    discountPercent: Number(storeResult.data?.discount_percent ?? 0),
    discountAppliesToCustomPrices: Boolean(
      storeResult.data?.discount_applies_to_custom_prices,
    ),
    customPricesByItemId,
  };
}
