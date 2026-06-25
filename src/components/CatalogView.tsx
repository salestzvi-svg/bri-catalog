"use client";

import { useEffect, useMemo, useState } from "react";
import type { CartItem, CatalogProduct, Category, CategoryLabel, StoreOrderItem } from "@/lib/types";
import { compareProducts } from "@/lib/product-sort";
import { filterProductsBySearch } from "@/lib/product-variants";
import {
  buildEmailOrderUrl,
  buildWhatsAppOrderUrl,
  getOrderEmail,
  type WhatsAppChannel,
} from "@/lib/whatsapp";
import { applyDiscount, type StoreUiStrings } from "@/lib/i18n/store-ui";
import {
  calculateDeliveryFee,
  calculateOrderTotal,
} from "@/lib/shipping";

const DELIVERY_SKU = "משלוח";

function buildWhatsAppUrl(
  phone: string,
  storeName: string,
  items: { sku: string; quantity: number; name?: string }[],
  notes: string,
  total: number,
  options?: { subtotal?: number; deliveryFee?: number },
) {
  return buildWhatsAppOrderUrl(phone, storeName, items, notes, total, options);
}

interface CategoryGroup {
  id: string;
  name: string;
  sortOrder: number;
  products: CatalogProduct[];
}

function formatPrice(price: number, locale: "he" | "en" = "he") {
  if (!price || price <= 0) return null;
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(price);
}

function unitPrice(price: number, discountPercent: number) {
  return applyDiscount(price, discountPercent);
}

function ProductPrice({
  price,
  discountPercent,
  showPrices,
  locale,
  compact = false,
}: {
  price: number;
  discountPercent: number;
  showPrices: boolean;
  locale: "he" | "en";
  compact?: boolean;
}) {
  if (!showPrices || !price || price <= 0) return null;
  const sale = unitPrice(price, discountPercent);
  if (discountPercent > 0 && sale < price) {
    return (
      <div className={compact ? "mt-0.5" : "mt-1"}>
        <p className={`text-gray-400 line-through ${compact ? "text-[10px]" : "text-xs"}`}>
          {formatPrice(price, locale)}
        </p>
        <p className={`font-bold text-emerald-800 ${compact ? "text-[11px]" : "text-sm"}`}>
          {formatPrice(sale, locale)}
        </p>
      </div>
    );
  }
  return (
    <p className={`font-bold text-emerald-800 ${compact ? "mt-0.5 text-[11px]" : "mt-1 text-sm"}`}>
      {formatPrice(price, locale)}
    </p>
  );
}

function QuantityStepper({
  value,
  onChange,
  t,
  compact = false,
}: {
  value: number;
  onChange: (value: number) => void;
  t: StoreUiStrings;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(String(value));
    }
  }, [value, focused]);

  function commitDraft() {
    const parsed = Number.parseInt(draft, 10);
    const next = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    onChange(next);
    setDraft(String(next));
  }

  return (
    <div className={`flex items-center rounded-md border border-gray-300 bg-white ${compact ? "w-full" : ""}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className={`font-bold text-gray-700 ${compact ? "px-1 py-0.5 text-sm" : "px-2 py-2 text-lg"}`}
        aria-label={t.decreaseQty}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={focused ? draft : String(value)}
        onFocus={(e) => {
          setFocused(true);
          setDraft(String(value));
          requestAnimationFrame(() => e.target.select());
        }}
        onBlur={() => {
          setFocused(false);
          commitDraft();
        }}
        onChange={(e) => {
          setDraft(e.target.value.replace(/\D/g, ""));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className={`flex-1 border-0 bg-emerald-50 text-center font-bold text-gray-900 outline-none ring-emerald-400 focus:bg-emerald-100 focus:ring-1 ${
          compact ? "w-7 py-0.5 text-xs" : "w-14 py-2 text-base focus:ring-2"
        }`}
        aria-label={t.qtyLabel}
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className={`font-bold text-gray-700 ${compact ? "px-1 py-0.5 text-sm" : "px-2 py-2 text-lg"}`}
        aria-label={t.increaseQty}
      >
        +
      </button>
    </div>
  );
}

function ProductGrid({
  products,
  cart,
  quantities,
  setQuantities,
  onAddToCart,
  onImageClick,
  showPrices,
  discountPercent,
  t,
  locale,
}: {
  products: CatalogProduct[];
  cart: Record<string, number>;
  quantities: Record<number, number>;
  setQuantities: React.Dispatch<
    React.SetStateAction<Record<number, number>>
  >;
  onAddToCart: (product: CatalogProduct) => void;
  onImageClick: (src: string, alt: string) => void;
  showPrices: boolean;
  discountPercent: number;
  t: StoreUiStrings;
  locale: "he" | "en";
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-600 shadow">
        {t.noProducts}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      {products.map((product) => {
        const inCart = (cart[product.sku] ?? 0) > 0;
        return (
          <article
            key={product.itemId}
            className={`flex flex-col rounded-lg p-1.5 shadow-sm transition ${
              inCart
                ? "border-2 border-emerald-600 bg-emerald-50"
                : "border border-gray-200 bg-white"
            }`}
          >
            <div className="relative">
              {product.image ? (
                <button
                  type="button"
                  onClick={() => onImageClick(product.image!, product.name)}
                  className="block w-full overflow-hidden rounded-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full object-cover"
                  />
                </button>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-md bg-gray-100 text-[10px] text-gray-500">
                  {t.noImage}
                </div>
              )}
              {inCart && (
                <span className="absolute end-1 top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                  {cart[product.sku]}
                </span>
              )}
            </div>

            <h3 className="mt-1 line-clamp-2 text-[11px] font-medium leading-tight text-gray-900">
              {product.name}
            </h3>
            <ProductPrice
              price={product.price}
              discountPercent={discountPercent}
              showPrices={showPrices}
              locale={locale}
              compact
            />

            <div className="mt-auto space-y-1 pt-1.5">
              <QuantityStepper
                value={quantities[product.itemId] ?? 1}
                onChange={(value) =>
                  setQuantities((prev) => ({
                    ...prev,
                    [product.itemId]: value,
                  }))
                }
                t={t}
                compact
              />
              <button
                type="button"
                onClick={() => onAddToCart(product)}
                className="w-full rounded-md bg-emerald-600 py-1 text-[11px] font-semibold text-white"
              >
                {t.add}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function CatalogView({
  storeName,
  initialProducts,
  initialCategories,
  initialCategoryLabels = [],
  whatsappNumber,
  whatsappChannel = "default",
  discountPercent = 0,
  t,
  locale,
  onToggleLocale,
}: {
  storeName: string;
  initialProducts: CatalogProduct[];
  initialCategories: Category[];
  initialCategoryLabels?: CategoryLabel[];
  whatsappNumber: string;
  whatsappChannel?: WhatsAppChannel;
  discountPercent?: number;
  t: StoreUiStrings;
  locale: "he" | "en";
  onToggleLocale: () => void;
}) {
  const SHOW_PRICES_KEY = "catalog_show_prices";
  const [products] = useState(initialProducts);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null,
  );
  const [showPrices, setShowPrices] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SHOW_PRICES_KEY);
      if (saved !== null) setShowPrices(saved === "true");
    } catch {
      // ignore
    }
  }, []);

  function toggleShowPrices() {
    setShowPrices((prev) => {
      const next = !prev;
      localStorage.setItem(SHOW_PRICES_KEY, String(next));
      return next;
    });
  }

  useEffect(() => {
    const defaults: Record<number, number> = {};
    for (const product of initialProducts) {
      defaults[product.itemId] = 1;
    }
    setQuantities(defaults);
  }, [initialProducts]);

  const labelsByCategory = useMemo(() => {
    const map = new Map<string, CategoryLabel[]>();
    for (const label of initialCategoryLabels) {
      const list = map.get(label.category_id) ?? [];
      list.push(label);
      map.set(label.category_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [initialCategoryLabels]);

  const categories = useMemo<CategoryGroup[]>(() => {
    const productsByCategory = new Map<string, CatalogProduct[]>();

    for (const product of products) {
      const list = productsByCategory.get(product.categoryId) ?? [];
      list.push(product);
      productsByCategory.set(product.categoryId, list);
    }

    return initialCategories.map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sort_order,
      products: (productsByCategory.get(category.id) ?? []).sort(compareProducts),
    }));
  }, [products, initialCategories]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const categoryLabels = selectedCategory
    ? (labelsByCategory.get(selectedCategory.id) ?? [])
    : [];
  const isSearching = search.trim().length > 0;
  const onCategoryPage = Boolean(selectedCategory);
  const browsingProducts = onCategoryPage;

  const categoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    let list = selectedCategory.products;
    if (search.trim()) {
      list = filterProductsBySearch(list, search);
    }
    if (selectedLabelId) {
      list = list.filter((p) => p.labelIds.includes(selectedLabelId));
    }
    return list;
  }, [selectedCategory, search, selectedLabelId]);

  const skuToProduct = useMemo(() => {
    const map = new Map<string, CatalogProduct>();
    for (const p of products) map.set(p.sku, p);
    return map;
  }, [products]);

  const cartItems: CartItem[] = Object.entries(cart).map(([sku, quantity]) => ({
    sku,
    quantity,
  }));

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  function addToCart(product: CatalogProduct) {
    const qty = quantities[product.itemId] || 1;
    setCart((prev) => ({
      ...prev,
      [product.sku]: qty,
    }));
  }

  function removeFromCart(sku: string) {
    setCart((prev) => {
      const next = { ...prev };
      delete next[sku];
      return next;
    });
    const product = products.find((p) => p.sku === sku);
    if (product) {
      setQuantities((prev) => ({ ...prev, [product.itemId]: 1 }));
    }
  }

  function updateCartQuantity(sku: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(sku);
      return;
    }
    setCart((prev) => ({ ...prev, [sku]: quantity }));
    const product = products.find((p) => p.sku === sku);
    if (product) {
      setQuantities((prev) => ({ ...prev, [product.itemId]: quantity }));
    }
  }

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const product = skuToProduct.get(item.sku);
      if (!product?.price || product.price <= 0) return sum;
      return sum + unitPrice(product.price, discountPercent) * item.quantity;
    }, 0);
  }, [cartItems, skuToProduct, discountPercent]);

  const deliveryFee = useMemo(
    () => calculateDeliveryFee(cartSubtotal),
    [cartSubtotal],
  );

  const orderTotal = useMemo(
    () => calculateOrderTotal(cartSubtotal),
    [cartSubtotal],
  );

  function openCategory(categoryId: string) {
    setSelectedCategoryId(categoryId);
    setSelectedLabelId(null);
    setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToCategories() {
    setSelectedCategoryId(null);
    setSelectedLabelId(null);
    setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function logout() {
    await fetch("/api/auth/store/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function persistOrder() {
    const orderItems: StoreOrderItem[] = cartItems.map((item) => {
      const product = skuToProduct.get(item.sku);
      const unit =
        product?.price && product.price > 0
          ? unitPrice(product.price, discountPercent)
          : null;
      const lineTotal =
        unit !== null ? unit * item.quantity : null;

      return {
        sku: item.sku,
        name: product?.name ?? item.sku,
        quantity: item.quantity,
        unitPrice: unit,
        lineTotal,
      };
    });

    if (deliveryFee > 0) {
      orderItems.push({
        sku: DELIVERY_SKU,
        name: t.deliveryFee,
        quantity: 1,
        unitPrice: deliveryFee,
        lineTotal: deliveryFee,
      });
    }

    try {
      await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: orderItems,
          totalAmount: orderTotal,
          notes: notes.trim() || null,
        }),
      });
    } catch {
      // המשך גם אם השמירה נכשלה
    }
  }

  function orderItemsForSend() {
    return cartItems.map((item) => ({
      sku: item.sku,
      quantity: item.quantity,
      name: skuToProduct.get(item.sku)?.name,
    }));
  }

  function clearOrderState() {
    setCart({});
    setNotes("");
    setCartOpen(false);
  }

  async function sendOrderViaWhatsApp() {
    if (cartItems.length === 0) {
      alert(t.emptyCart);
      return;
    }

    await persistOrder();

    window.open(
      buildWhatsAppUrl(
        whatsappNumber,
        storeName,
        orderItemsForSend(),
        notes,
        orderTotal,
        { subtotal: cartSubtotal, deliveryFee },
      ),
      "_blank",
      "noopener,noreferrer",
    );

    clearOrderState();
  }

  async function sendOrderViaEmail() {
    if (cartItems.length === 0) {
      alert(t.emptyCart);
      return;
    }

    const items = orderItemsForSend();
    const orderNotes = notes;
    const total = orderTotal;

    await persistOrder();

    const email = getOrderEmail(whatsappChannel);
    const mailtoUrl = buildEmailOrderUrl(
      email,
      storeName,
      items,
      orderNotes,
      total,
      { subtotal: cartSubtotal, deliveryFee },
    );

    clearOrderState();
    window.location.href = mailtoUrl;
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-gray-50 pb-36">
      <header className="sticky top-0 z-20 border-b border-emerald-100 bg-white shadow-sm">
        <div className="flex items-center gap-1.5 px-2 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-gray-500">{t.hello}</p>
            <h1 className="truncate text-base font-bold text-emerald-800">
              {storeName}
            </h1>
            {browsingProducts && (
              <p className="truncate text-sm font-medium text-gray-700">
                {isSearching
                  ? `${t.searchLabel}: ${search.trim()}`
                  : selectedCategory?.name}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleLocale}
            className="rounded-lg border border-gray-300 px-2 py-2 text-xs font-medium"
            aria-label={t.languageAria}
          >
            {t.language}
          </button>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative rounded-lg border border-gray-300 p-2"
            aria-label={t.cart}
          >
            <span className="text-xl">🛒</span>
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1 text-xs font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>

          <button
            onClick={logout}
            className="rounded-lg border border-gray-300 px-2 py-2 text-xs"
          >
            {t.logout}
          </button>
        </div>

        {browsingProducts && (
          <button
            type="button"
            onClick={goToCategories}
            className="flex w-full items-center justify-center gap-2 border-t border-emerald-200 bg-emerald-600 px-3 py-2 text-sm font-bold text-white active:bg-emerald-700"
          >
            <span aria-hidden="true">{locale === "he" ? "→" : "←"}</span>
            {t.backToCategories}
          </button>
        )}

        {onCategoryPage && categories.length > 1 && (
          <div className="border-t border-gray-100 bg-gray-50 px-2 py-1.5">
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setSelectedLabelId(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                    category.id === selectedCategoryId
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "border border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {onCategoryPage && categoryLabels.length > 0 && (
          <div className="border-t border-gray-100 bg-white px-2 py-1.5">
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setSelectedLabelId(null)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                  selectedLabelId === null
                    ? "bg-emerald-600 text-white"
                    : "border border-gray-200 bg-gray-50 text-gray-700"
                }`}
              >
                {t.allLabels}
              </button>
              {categoryLabels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => setSelectedLabelId(label.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                    selectedLabelId === label.id
                      ? "bg-emerald-600 text-white"
                      : "border border-gray-200 bg-gray-50 text-gray-700"
                  }`}
                >
                  {label.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {onCategoryPage && (
          <div className="flex items-center gap-2 border-t border-gray-100 px-2 py-1.5">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
            />
            <label className="flex shrink-0 items-center gap-1 text-[11px] text-gray-600">
              <input
                type="checkbox"
                checked={showPrices}
                onChange={toggleShowPrices}
                className="h-3.5 w-3.5 rounded border-gray-300"
              />
              {t.showPrices}
            </label>
          </div>
        )}
      </header>

      <main className="scroll-smooth px-2 py-2">
        {categories.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-gray-600 shadow">
            <p className="font-medium">{t.emptyCatalog}</p>
          </div>
        ) : onCategoryPage ? (
          <ProductGrid
            products={categoryProducts}
            cart={cart}
            quantities={quantities}
            setQuantities={setQuantities}
            onAddToCart={addToCart}
            onImageClick={(src, alt) => setLightbox({ src, alt })}
            showPrices={showPrices}
            discountPercent={discountPercent}
            t={t}
            locale={locale}
          />
        ) : (
          <div className="space-y-1.5">
            <p className="px-0.5 text-xs text-gray-600">{t.pickCategory}</p>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => openCategory(category.id)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-start shadow-sm transition active:border-emerald-300 active:bg-emerald-50"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-gray-900">
                    {category.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {category.products.length} {t.productsCount}
                  </p>
                </div>
                <span
                  className="ms-3 shrink-0 text-xl text-emerald-600"
                  aria-hidden="true"
                >
                  {locale === "he" ? "‹" : "›"}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white p-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="mx-auto max-w-lg space-y-1.5">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.notesOptional}
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={sendOrderViaWhatsApp}
              disabled={cartItems.length === 0}
              className={`rounded-lg px-2 py-2 text-xs font-bold text-white ${
                cartItems.length > 0 ? "bg-green-600" : "bg-gray-400"
              }`}
            >
              {t.sendWhatsAppOrder}
            </button>
            <button
              type="button"
              onClick={sendOrderViaEmail}
              disabled={cartItems.length === 0}
              className={`rounded-lg border px-2 py-2 text-xs font-bold ${
                cartItems.length > 0
                  ? "border-emerald-600 text-emerald-800"
                  : "border-gray-300 text-gray-400"
              }`}
            >
              {t.sendEmailOrder}
            </button>
          </div>
        </div>
      </footer>

      {cartOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-black/40"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="flex max-h-[70vh] w-full flex-col rounded-t-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 p-4">
              <h2 className="text-lg font-bold">
                {t.cartTitle} ({cartCount})
              </h2>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="text-gray-500"
              >
                {t.close}
              </button>
            </div>

            {cartItems.length === 0 ? (
              <p className="py-8 text-center text-gray-500">{t.cartEmpty}</p>
            ) : (
              <>
                <ul className="flex-1 space-y-4 overflow-y-auto p-4">
                  {cartItems.map((item) => {
                    const product = skuToProduct.get(item.sku);
                    const basePrice =
                      product?.price && product.price > 0 ? product.price : null;
                    const saleUnit =
                      basePrice !== null
                        ? unitPrice(basePrice, discountPercent)
                        : null;
                    const lineTotal =
                      saleUnit !== null ? saleUnit * item.quantity : null;

                    return (
                      <li
                        key={item.sku}
                        className="border-b border-gray-100 pb-4"
                      >
                        <div className="flex items-start gap-3">
                          {product?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image}
                              alt={product.name}
                              loading="lazy"
                              decoding="async"
                              className="h-16 w-16 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-500">
                              {t.noImage}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug">
                              {product?.name ?? item.sku}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {t.sku}: {item.sku}
                            </p>
                            {(showPrices || lineTotal !== null) &&
                              lineTotal !== null &&
                              saleUnit !== null &&
                              basePrice !== null && (
                              <div className="mt-1">
                                {discountPercent > 0 && saleUnit < basePrice ? (
                                  <>
                                    <p className="text-xs text-gray-400 line-through">
                                      {formatPrice(basePrice * item.quantity, locale)}
                                    </p>
                                    <p className="text-sm font-semibold text-emerald-700">
                                      {formatPrice(lineTotal, locale)}
                                      {item.quantity > 1
                                        ? ` (${formatPrice(saleUnit, locale)} × ${item.quantity})`
                                        : null}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-sm font-semibold text-emerald-700">
                                    {formatPrice(lineTotal, locale)}
                                    {item.quantity > 1
                                      ? ` (${formatPrice(saleUnit, locale)} × ${item.quantity})`
                                      : null}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <QuantityStepper
                            value={item.quantity}
                            onChange={(qty) =>
                              updateCartQuantity(item.sku, qty)
                            }
                            t={t}
                          />
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.sku)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600"
                          >
                            {t.removeAll}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {orderTotal > 0 && (
                  <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
                    <div className="space-y-2 rounded-xl bg-emerald-50 px-4 py-3">
                      {deliveryFee > 0 && (
                        <>
                          <div className="flex items-center justify-between text-sm text-gray-700">
                            <span>{t.productsSubtotal}</span>
                            <span>{formatPrice(cartSubtotal, locale)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-700">
                            <span>{t.deliveryFee}</span>
                            <span>{formatPrice(deliveryFee, locale)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">{t.totalPayment}</span>
                        <span className="text-lg font-bold text-emerald-800">
                          {formatPrice(orderTotal, locale)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute left-4 top-4 rounded-full bg-white/20 px-3 py-1 text-white"
            onClick={() => setLightbox(null)}
          >
            {t.close}
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
