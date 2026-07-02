/** מינימום סכום מוצרים (אחרי הנחה) לשליחת הזמנה */
export const ORDER_MINIMUM = 100;

/** מינימום להזמנה ללא תוספת משלוח (אחרי הנחה) */
export const FREE_SHIPPING_MINIMUM = 400;

/** מקסימום דמי משלוח */
export const MAX_DELIVERY_FEE = 40;

export const DELIVERY_SKU = "משלוח";
export const SELF_PICKUP_SKU = "איסוף עצמי";

export function meetsOrderMinimum(subtotalAfterDiscount: number): boolean {
  return subtotalAfterDiscount >= ORDER_MINIMUM;
}

/**
 * דמי משלוח אחרי הנחה:
 * - איסוף עצמי → 0
 * - מעל 400 ₪ → 0
 * - מתחת → min(40, 400 − סכום), למשל 380→20, 100→40
 */
export function calculateDeliveryFee(
  subtotalAfterDiscount: number,
  selfPickup = false,
): number {
  if (selfPickup || subtotalAfterDiscount <= 0) return 0;
  if (subtotalAfterDiscount >= FREE_SHIPPING_MINIMUM) return 0;
  const gap = FREE_SHIPPING_MINIMUM - subtotalAfterDiscount;
  const fee = Math.min(MAX_DELIVERY_FEE, gap);
  return Math.round(fee * 100) / 100;
}

export function calculateOrderTotal(
  subtotalAfterDiscount: number,
  selfPickup = false,
): number {
  return (
    Math.round(
      (subtotalAfterDiscount +
        calculateDeliveryFee(subtotalAfterDiscount, selfPickup)) *
        100,
    ) / 100
  );
}

export function isFulfillmentSku(sku: string): boolean {
  return sku === DELIVERY_SKU || sku === SELF_PICKUP_SKU;
}
