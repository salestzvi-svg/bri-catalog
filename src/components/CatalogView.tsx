"use client";

import { useEffect, useMemo, useState } from "react";
import type { CartItem, CatalogProduct, StoreOrderItem } from "@/lib/types";
import {
  buildEmailOrderUrl,
  buildWhatsAppOrderUrl,
  getOrderEmail,
  type WhatsAppChannel,
} from "@/lib/whatsapp";

function buildWhatsAppUrl(
  phone: string,
  storeName: string,
  items: { sku: string; quantity: number; name?: string }[],
  notes: string,
  total: number,
) {
  return buildWhatsAppOrderUrl(phone, storeName, items, notes, total);
}

function compareSku(a: string, b: string) {
  const numA = Number.parseInt(a, 10);
  const numB = Number.parseInt(b, 10);
  if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
  return a.localeCompare(b, "he", { numeric: true });
}

function matchesSearch(product: CatalogProduct, term: string) {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return (
    product.name.toLowerCase().includes(q) ||
    product.sku.toLowerCase().includes(q)
  );
}

interface CategoryGroup {
  id: string;
  name: string;
  sortOrder: number;
  products: CatalogProduct[];
}

function formatPrice(price: number) {
  if (!price || price <= 0) return null;
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(price);
}

function QuantityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
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
    <div className="flex items-center rounded-lg border border-gray-300 bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="px-2 py-2 text-lg font-bold text-gray-700"
        aria-label="הפחת כמות"
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
        className="w-14 border-0 bg-emerald-50 py-2 text-center text-base font-bold text-gray-900 outline-none ring-emerald-400 focus:bg-emerald-100 focus:ring-2"
        aria-label="כמות — הקלד מספר"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="px-2 py-2 text-lg font-bold text-gray-700"
        aria-label="הוסף כמות"
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
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-600 shadow">
        לא נמצאו מוצרים.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {products.map((product) => {
        const inCart = (cart[product.sku] ?? 0) > 0;
        return (
          <article
            key={product.itemId}
            className={`flex flex-col rounded-2xl p-3 shadow-sm transition ${
              inCart
                ? "border-2 border-emerald-600 bg-emerald-100"
                : "border border-gray-200 bg-white"
            }`}
          >
            {product.image ? (
              <button
                type="button"
                onClick={() => onImageClick(product.image!, product.name)}
                className="mb-2 overflow-hidden rounded-xl"
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
              <div className="mb-2 flex aspect-square w-full items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-500">
                אין תמונה
              </div>
            )}

            <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">
              {product.name}
            </h3>
            <p className="mt-1 text-xs text-gray-500">מק&quot;ט: {product.sku}</p>
            {showPrices && formatPrice(product.price) && (
              <p className="mt-1 text-sm font-bold text-emerald-800">
                {formatPrice(product.price)}
              </p>
            )}
            {inCart && (
              <p className="mt-1 text-xs font-medium text-emerald-800">
                בעגלה: {cart[product.sku]}
              </p>
            )}

            <div className="mt-auto flex items-center gap-2 pt-3">
              <QuantityStepper
                value={quantities[product.itemId] ?? 1}
                onChange={(value) =>
                  setQuantities((prev) => ({
                    ...prev,
                    [product.itemId]: value,
                  }))
                }
              />
              <button
                onClick={() => onAddToCart(product)}
                className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white"
              >
                הוסף
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
  whatsappNumber,
  whatsappChannel = "default",
}: {
  storeName: string;
  initialProducts: CatalogProduct[];
  whatsappNumber: string;
  whatsappChannel?: WhatsAppChannel;
}) {
  const SHOW_PRICES_KEY = "catalog_show_prices";
  const [products] = useState(initialProducts);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
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

  const categories = useMemo<CategoryGroup[]>(() => {
    const map = new Map<string, CategoryGroup>();

    for (const product of products) {
      const existing = map.get(product.categoryId);
      if (existing) {
        existing.products.push(product);
      } else {
        map.set(product.categoryId, {
          id: product.categoryId,
          name: product.categoryName,
          sortOrder: product.categorySortOrder,
          products: [product],
        });
      }
    }

    for (const group of map.values()) {
      group.products.sort((a, b) => compareSku(a.sku, b.sku));
    }

    return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [products]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const isSearching = search.trim().length > 0;
  const onCategoryPage = Boolean(selectedCategory);
  const browsingProducts = onCategoryPage || (isSearching && !onCategoryPage);

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    return products
      .filter((p) => matchesSearch(p, search))
      .sort((a, b) => compareSku(a.sku, b.sku));
  }, [products, search, isSearching]);

  const categoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return selectedCategory.products.filter((p) => matchesSearch(p, search));
  }, [selectedCategory, search]);

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

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const product = skuToProduct.get(item.sku);
      if (!product?.price || product.price <= 0) return sum;
      return sum + product.price * item.quantity;
    }, 0);
  }, [cartItems, skuToProduct]);

  function openCategory(categoryId: string) {
    setSelectedCategoryId(categoryId);
    setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToCategories() {
    setSelectedCategoryId(null);
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
      const unitPrice =
        product?.price && product.price > 0 ? product.price : null;
      const lineTotal =
        unitPrice !== null ? unitPrice * item.quantity : null;

      return {
        sku: item.sku,
        name: product?.name ?? item.sku,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });

    try {
      await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: orderItems,
          totalAmount: cartTotal,
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
      alert("העגלה ריקה. הוסף מוצרים לפני שליחה.");
      return;
    }

    await persistOrder();

    window.open(
      buildWhatsAppUrl(
        whatsappNumber,
        storeName,
        orderItemsForSend(),
        notes,
        cartTotal,
      ),
      "_blank",
      "noopener,noreferrer",
    );

    clearOrderState();
  }

  async function sendOrderViaEmail() {
    if (cartItems.length === 0) {
      alert("העגלה ריקה. הוסף מוצרים לפני שליחה.");
      return;
    }

    const items = orderItemsForSend();
    const orderNotes = notes;
    const total = cartTotal;

    await persistOrder();

    const email = getOrderEmail(whatsappChannel);
    const mailtoUrl = buildEmailOrderUrl(
      email,
      storeName,
      items,
      orderNotes,
      total,
    );

    clearOrderState();
    window.location.href = mailtoUrl;
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-gray-50 pb-40">
      <header className="sticky top-0 z-20 border-b border-emerald-100 bg-white shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-gray-500">שלום,</p>
            <h1 className="truncate text-base font-bold text-emerald-800">
              {storeName}
            </h1>
            {browsingProducts && (
              <p className="truncate text-sm font-medium text-gray-700">
                {isSearching && !onCategoryPage
                  ? `חיפוש: ${search.trim()}`
                  : selectedCategory?.name}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative rounded-lg border border-gray-300 p-2"
            aria-label="עגלת קניות"
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
            יציאה
          </button>
        </div>

        {browsingProducts && (
          <button
            type="button"
            onClick={goToCategories}
            className="flex w-full items-center justify-center gap-2 border-t border-emerald-200 bg-emerald-600 px-4 py-3.5 text-base font-bold text-white active:bg-emerald-700"
          >
            <span aria-hidden="true">→</span>
            חזרה לקטגוריות
          </button>
        )}

        {onCategoryPage && categories.length > 1 && (
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
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

        {categories.length > 0 && (
          <div className="space-y-2 px-4 pb-3 pt-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם או מק״ט..."
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showPrices}
                onChange={toggleShowPrices}
                className="h-4 w-4 rounded border-gray-300"
              />
              הצג מחירים (מחיר מכירה מ-Rivhit)
            </label>
          </div>
        )}
      </header>

      <main className="scroll-smooth px-4 py-4">
        {categories.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-gray-600 shadow">
            <p className="font-medium">הקטלוג עדיין ריק</p>
          </div>
        ) : isSearching && !onCategoryPage ? (
          <ProductGrid
            products={searchResults}
            cart={cart}
            quantities={quantities}
            setQuantities={setQuantities}
            onAddToCart={addToCart}
            onImageClick={(src, alt) => setLightbox({ src, alt })}
            showPrices={showPrices}
          />
        ) : onCategoryPage ? (
          <ProductGrid
            products={categoryProducts}
            cart={cart}
            quantities={quantities}
            setQuantities={setQuantities}
            onAddToCart={addToCart}
            onImageClick={(src, alt) => setLightbox({ src, alt })}
            showPrices={showPrices}
          />
        ) : (
          <div className="space-y-2">
            <p className="px-1 text-sm text-gray-600">בחר קטגוריה:</p>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => openCategory(category.id)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-4 text-right shadow-sm transition active:border-emerald-300 active:bg-emerald-50"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-gray-900">
                    {category.name}
                  </h3>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {category.products.length} מוצרים
                  </p>
                </div>
                <span
                  className="mr-3 shrink-0 text-xl text-emerald-600"
                  aria-hidden="true"
                >
                  ‹
                </span>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="mx-auto max-w-lg space-y-2">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="הערות (אופציונלי)"
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={sendOrderViaWhatsApp}
              disabled={cartItems.length === 0}
              className={`w-full rounded-xl px-3 py-3 text-sm font-bold text-white ${
                cartItems.length > 0 ? "bg-green-600" : "bg-gray-400"
              }`}
            >
              שלח הזמנה בווצאפ
            </button>
            <button
              type="button"
              onClick={sendOrderViaEmail}
              disabled={cartItems.length === 0}
              className={`w-full rounded-xl border px-3 py-3 text-sm font-bold ${
                cartItems.length > 0
                  ? "border-emerald-600 text-emerald-800"
                  : "border-gray-300 text-gray-400"
              }`}
            >
              שלח הזמנה במייל
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
              <h2 className="text-lg font-bold">עגלת קניות ({cartCount})</h2>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="text-gray-500"
              >
                סגור
              </button>
            </div>

            {cartItems.length === 0 ? (
              <p className="py-8 text-center text-gray-500">העגלה ריקה</p>
            ) : (
              <>
                <ul className="flex-1 space-y-4 overflow-y-auto p-4">
                  {cartItems.map((item) => {
                    const product = skuToProduct.get(item.sku);
                    const lineTotal =
                      product?.price && product.price > 0
                        ? product.price * item.quantity
                        : null;

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
                              אין תמונה
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug">
                              {product?.name ?? item.sku}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              מק&quot;ט: {item.sku}
                            </p>
                            {(showPrices || lineTotal !== null) &&
                              lineTotal !== null && (
                              <p className="mt-1 text-sm font-semibold text-emerald-700">
                                {formatPrice(lineTotal)}
                                {item.quantity > 1 && product?.price
                                  ? ` (${formatPrice(product.price)} × ${item.quantity})`
                                  : null}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <QuantityStepper
                            value={item.quantity}
                            onChange={(qty) =>
                              updateCartQuantity(item.sku, qty)
                            }
                          />
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.sku)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600"
                          >
                            הסר לגמרי
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {cartTotal > 0 && (
                  <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                      <span className="font-bold text-gray-900">סה״כ לתשלום</span>
                      <span className="text-lg font-bold text-emerald-800">
                        {formatPrice(cartTotal)}
                      </span>
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
            סגור
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
