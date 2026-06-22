"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogProduct, RivhitDocumentType } from "@/lib/types";
import AgentNav from "@/components/AgentNav";

interface CustomerOption {
  id: number;
  storeName: string;
  managerName: string;
  label: string;
  phone: string;
  city: string;
  email: string;
  agentId: number;
}

function formatPrice(price: number) {
  if (!price || price <= 0) return null;
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(price);
}

function compareSku(a: string, b: string) {
  const numA = Number.parseInt(a, 10);
  const numB = Number.parseInt(b, 10);
  if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
  return a.localeCompare(b, "he", { numeric: true });
}

function QuantityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-gray-300 bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="px-2 py-2 text-lg font-bold text-gray-700"
      >
        −
      </button>
      <span className="w-10 text-center text-sm font-bold">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="px-2 py-2 text-lg font-bold text-gray-700"
      >
        +
      </button>
    </div>
  );
}

export default function AgentOrderView({
  agentName,
  rivhitAgentId,
}: {
  agentName: string;
  rivhitAgentId: number;
}) {
  const [phase, setPhase] = useState<"setup" | "catalog">("setup");
  const [documentTypes, setDocumentTypes] = useState<RivhitDocumentType[]>([]);
  const [documentTypeId, setDocumentTypeId] = useState(7);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(
    null,
  );
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [setupError, setSetupError] = useState("");

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [newCustomer, setNewCustomer] = useState({
    storeName: "",
    managerName: "",
    idNumber: "",
    vatNumber: "",
    phone: "",
    address: "",
    city: "",
    email: "",
  });

  useEffect(() => {
    async function loadSetup() {
      try {
        const [typesRes, customersRes] = await Promise.all([
          fetch("/api/agent/document-types"),
          fetch("/api/agent/customers"),
        ]);
        const typesData = await typesRes.json();
        const customersData = await customersRes.json();
        if (!typesRes.ok) throw new Error(typesData.error);
        if (!customersRes.ok) throw new Error(customersData.error);
        setDocumentTypes(typesData.types ?? []);
        setDocumentTypeId(typesData.defaultTypeId ?? 7);
        setCustomers(customersData.customers ?? []);
      } catch (error) {
        setSetupError(
          error instanceof Error ? error.message : "שגיאה בטעינת נתונים",
        );
      } finally {
        setLoadingSetup(false);
      }
    }
    loadSetup();
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 30);
    return customers
      .filter((c) => {
        const label = (c.label ?? "").toLowerCase();
        const phone = c.phone ?? "";
        const city = (c.city ?? "").toLowerCase();
        const store = (c.storeName ?? "").toLowerCase();
        const manager = (c.managerName ?? "").toLowerCase();
        return (
          label.includes(q) ||
          phone.includes(q) ||
          city.includes(q) ||
          store.includes(q) ||
          manager.includes(q)
        );
      })
      .slice(0, 30);
  }, [customers, customerSearch]);

  const categories = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        sortOrder: number;
        products: CatalogProduct[];
        image: string | null;
      }
    >();
    for (const product of products) {
      if (!map.has(product.categoryId)) {
        map.set(product.categoryId, {
          id: product.categoryId,
          name: product.categoryName,
          sortOrder: product.categorySortOrder,
          products: [],
          image: product.image,
        });
      }
      map.get(product.categoryId)!.products.push(product);
    }
    return Array.from(map.values())
      .map((cat) => ({
        ...cat,
        products: [...cat.products].sort((a, b) => compareSku(a.sku, b.sku)),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [products]);

  const skuToProduct = useMemo(() => {
    const map = new Map<string, CatalogProduct>();
    for (const p of products) map.set(p.sku, p);
    return map;
  }, [products]);

  const cartItems = Object.entries(cart).map(([sku, quantity]) => ({
    sku,
    quantity,
  }));
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => {
    const p = skuToProduct.get(item.sku);
    return sum + (p?.price ?? 0) * item.quantity;
  }, 0);

  const selectedDocType = documentTypes.find(
    (t) => t.document_type === documentTypeId,
  );

  async function startCatalog() {
    if (!selectedCustomer) return;
    setLoadingCatalog(true);
    setSubmitError("");
    setSubmitResult("");
    try {
      const response = await fetch("/api/agent/catalog");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProducts(data.products ?? []);
      setPhase("catalog");
      setSelectedCategoryId(null);
      setCart({});
      setSearch("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "שגיאה");
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function createCustomer() {
    const response = await fetch("/api/agent/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCustomer),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "שגיאה");
      return;
    }
    const created = data.customer as CustomerOption;
    setCustomers((prev) => [created, ...prev]);
    setSelectedCustomer(created);
    setShowNewCustomer(false);
    setNewCustomer({
      storeName: "",
      managerName: "",
      idNumber: "",
      vatNumber: "",
      phone: "",
      address: "",
      city: "",
      email: "",
    });
  }

  async function assignCustomerToMe() {
    if (!selectedCustomer) return;
    const response = await fetch("/api/agent/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: selectedCustomer.id }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "שגיאה");
      return;
    }
    const updated = { ...selectedCustomer, agentId: rivhitAgentId };
    setSelectedCustomer(updated);
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === updated.id ? { ...c, agentId: rivhitAgentId } : c,
      ),
    );
  }

  function addToCart(product: CatalogProduct) {
    const qty = quantities[product.itemId] || 1;
    setCart((prev) => ({ ...prev, [product.sku]: qty }));
  }

  function updateCartQuantity(sku: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => {
        const next = { ...prev };
        delete next[sku];
        return next;
      });
      return;
    }
    setCart((prev) => ({ ...prev, [sku]: quantity }));
  }

  async function submitOrder() {
    if (!selectedCustomer || cartItems.length === 0) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitResult("");
    try {
      const items = cartItems.map((item) => {
        const product = skuToProduct.get(item.sku)!;
        return {
          itemId: product.itemId,
          quantity: item.quantity,
          price: product.price,
        };
      });
      const response = await fetch("/api/agent/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          documentType: documentTypeId,
          items,
          comments,
          totalAmount: cartTotal,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSubmitResult(
        `נשלח לריווחית! מסמך #${data.documentNumber}${data.documentLink ? " — PDF זמין" : ""}`,
      );
      setCart({});
      setComments("");
      setCartOpen(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "שגיאה בשליחה",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const categoryProducts =
    categories.find((c) => c.id === selectedCategoryId)?.products ?? [];
  const searchResults = products.filter(
    (p) =>
      search.trim() &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())),
  );
  const onCategoryPage = selectedCategoryId !== null;
  const isSearching = search.trim().length > 0;

  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-gray-50">
        <AgentNav agentName={agentName} />
        <main className="mx-auto max-w-lg px-4 py-6">
          <h2 className="text-xl font-bold text-indigo-900">הזמנה חדשה</h2>
          {loadingSetup ? (
            <p className="mt-4 text-sm text-gray-500">טוען...</p>
          ) : setupError ? (
            <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {setupError}
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <label className="mb-1 block text-sm font-medium">
                  סוג מסמך
                </label>
                <select
                  value={documentTypeId}
                  onChange={(e) => setDocumentTypeId(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                >
                  {documentTypes.map((t) => (
                    <option key={t.document_type} value={t.document_type}>
                      {t.document_name.trim()}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  ברירת מחדל: הזמנה. ניתן לשנות לפני תחילת ההזמנה.
                </p>
                {selectedDocType?.is_invoice_receipt && (
                  <p className="mt-2 text-xs text-amber-700">
                    חשבונית מס קבלה — יירשם תשלום מזומן בסכום מלא.
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <label className="mb-1 block text-sm font-medium">
                  חיפוש לקוח
                </label>
                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="שם חנות, מנהל, טלפון..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                />
                <ul className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-gray-200">
                  {filteredCustomers.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(c)}
                        className={`w-full px-3 py-2 text-right text-sm hover:bg-indigo-50 ${
                          selectedCustomer?.id === c.id
                            ? "bg-indigo-100 font-semibold"
                            : ""
                        }`}
                      >
                        {c.label}
                        {c.agentId > 0 && (
                          <span className="mr-2 text-xs text-gray-500">
                            (סוכן #{c.agentId})
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>

                {selectedCustomer && (
                  <div className="mt-3 rounded-xl bg-indigo-50 p-3 text-sm">
                    <p className="font-semibold">נבחר: {selectedCustomer.label}</p>
                    {selectedCustomer.agentId === 0 && (
                      <button
                        type="button"
                        onClick={assignCustomerToMe}
                        className="mt-2 text-indigo-700 underline"
                      >
                        שייך אליי כסוכן בריווחית
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowNewCustomer(true)}
                  className="mt-3 w-full rounded-xl border border-indigo-300 py-2.5 text-sm font-medium text-indigo-800"
                >
                  + לקוח חדש
                </button>
              </div>

              <button
                type="button"
                disabled={!selectedCustomer || loadingCatalog}
                onClick={startCatalog}
                className="w-full rounded-xl bg-indigo-700 py-3 font-semibold text-white disabled:opacity-60"
              >
                {loadingCatalog ? "טוען קטלוג..." : "המשך לבחירת מוצרים"}
              </button>
            </div>
          )}

          {showNewCustomer && (
            <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:p-4">
              <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:max-w-lg sm:rounded-2xl">
                <h3 className="text-lg font-bold">לקוח חדש בריווחית</h3>
                <p className="mt-1 text-xs text-gray-500">
                  יתויג אוטומטית לסוכן: {agentName}
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    ["storeName", "שם חנות *"],
                    ["managerName", "שם מנהל *"],
                    ["idNumber", "ח.פ / ת.ז"],
                    ["vatNumber", "עוסק מורשה"],
                    ["phone", "טלפון"],
                    ["address", "כתובת"],
                    ["city", "עיר"],
                    ["email", "מייל"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs">{label}</label>
                      <input
                        value={newCustomer[key as keyof typeof newCustomer]}
                        onChange={(e) =>
                          setNewCustomer((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCustomer(false)}
                    className="flex-1 rounded-xl border py-2.5 text-sm"
                  >
                    ביטול
                  </button>
                  <button
                    type="button"
                    onClick={createCustomer}
                    className="flex-1 rounded-xl bg-indigo-700 py-2.5 text-sm font-semibold text-white"
                  >
                    שמור
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-gray-50 pb-28">
      <AgentNav agentName={agentName} />
      <div className="border-b border-indigo-100 bg-white px-4 py-3 text-sm">
        <button
          type="button"
          onClick={() => setPhase("setup")}
          className="text-indigo-700"
        >
          ← חזרה
        </button>
        <p className="mt-1 font-semibold">{selectedCustomer?.label}</p>
        <p className="text-xs text-gray-500">
          {selectedDocType?.document_name.trim()}
        </p>
      </div>

      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3">
        {onCategoryPage ? (
          <button
            onClick={() => setSelectedCategoryId(null)}
            className="text-sm text-indigo-700"
          >
            ← קטגוריות
          </button>
        ) : null}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש מוצר..."
          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm"
        />
      </header>

      <main className="px-4 py-4">
        {isSearching && !onCategoryPage ? (
          <ProductList
            products={searchResults}
            cart={cart}
            quantities={quantities}
            setQuantities={setQuantities}
            onAdd={addToCart}
          />
        ) : onCategoryPage ? (
          <ProductList
            products={categoryProducts}
            cart={cart}
            quantities={quantities}
            setQuantities={setQuantities}
            onAdd={addToCart}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className="overflow-hidden rounded-2xl bg-white text-right shadow-sm"
              >
                {cat.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-indigo-100 text-3xl">
                    📦
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-bold">{cat.name}</h3>
                  <p className="text-xs text-gray-500">
                    {cat.products.length} מוצרים
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t bg-white p-3">
        {submitResult && (
          <p className="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {submitResult}
          </p>
        )}
        {submitError && (
          <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {submitError}
          </p>
        )}
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <input
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="הערות"
            className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative rounded-xl border px-3 py-2.5"
          >
            🛒
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-indigo-600 px-1.5 text-xs text-white">
                {cartCount}
              </span>
            )}
          </button>
          <button
            type="button"
            disabled={submitting || cartCount === 0}
            onClick={submitOrder}
            className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? "..." : "שלח"}
          </button>
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
            <div className="flex shrink-0 justify-between border-b p-4">
              <h2 className="font-bold">עגלה ({cartCount})</h2>
              <button type="button" onClick={() => setCartOpen(false)}>
                סגור
              </button>
            </div>
            <ul className="flex-1 space-y-3 overflow-y-auto p-4">
              {cartItems.map((item) => {
                const p = skuToProduct.get(item.sku);
                return (
                  <li key={item.sku} className="border-b pb-3">
                    <p className="text-sm font-medium">{p?.name ?? item.sku}</p>
                    <p className="text-xs text-gray-500">מק&quot;ט: {item.sku}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <QuantityStepper
                        value={item.quantity}
                        onChange={(q) => updateCartQuantity(item.sku, q)}
                      />
                      {p?.price ? (
                        <span className="text-sm font-semibold text-indigo-800">
                          {formatPrice(p.price * item.quantity)}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            {cartTotal > 0 && (
              <div className="shrink-0 border-t p-4">
                <div className="flex justify-between rounded-xl bg-indigo-50 px-4 py-3 font-bold">
                  <span>סה״כ</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductList({
  products,
  cart,
  quantities,
  setQuantities,
  onAdd,
}: {
  products: CatalogProduct[];
  cart: Record<string, number>;
  quantities: Record<number, number>;
  setQuantities: React.Dispatch<
    React.SetStateAction<Record<number, number>>
  >;
  onAdd: (p: CatalogProduct) => void;
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-600">
        לא נמצאו מוצרים
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
            className={`rounded-2xl p-3 shadow-sm ${
              inCart
                ? "border-2 border-indigo-600 bg-indigo-50"
                : "border border-gray-200 bg-white"
            }`}
          >
            {product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image}
                alt={product.name}
                className="mb-2 aspect-square w-full rounded-xl object-cover"
              />
            ) : (
              <div className="mb-2 flex aspect-square items-center justify-center rounded-xl bg-gray-100 text-xs">
                אין תמונה
              </div>
            )}
            <h3 className="line-clamp-2 text-sm font-semibold">{product.name}</h3>
            <p className="text-xs text-gray-500">מק&quot;ט: {product.sku}</p>
            {formatPrice(product.price) && (
              <p className="text-sm font-bold text-indigo-800">
                {formatPrice(product.price)}
              </p>
            )}
            <div className="mt-2 flex items-center gap-1">
              <QuantityStepper
                value={quantities[product.itemId] ?? 1}
                onChange={(v) =>
                  setQuantities((prev) => ({ ...prev, [product.itemId]: v }))
                }
              />
              <button
                onClick={() => onAdd(product)}
                className="flex-1 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white"
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
