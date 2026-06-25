"use client";

import { useEffect, useMemo, useState } from "react";
import StoreOrdersModal from "@/components/StoreOrdersModal";
import { findProductByAdminQuery } from "@/lib/product-variants";
import type { StoreProductPriceRow } from "@/lib/store-pricing";

interface StoreRow {
  id: string;
  store_name: string;
  username: string;
  created_at: string;
  discount_percent?: number;
  discount_applies_to_custom_prices?: boolean;
}

interface CatalogProductLite {
  itemId: number;
  sku: string;
  name: string;
  price: number;
  image: string | null;
  searchAliases?: string;
}

function formatNis(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(value);
}

function StoreProductPricingPanel({
  storeId,
  discountPercent,
  discountAppliesToCustomPrices,
  onDiscountAppliesChange,
  onError,
  onMessage,
}: {
  storeId: string;
  discountPercent: number;
  discountAppliesToCustomPrices: boolean;
  onDiscountAppliesChange: (value: boolean) => void;
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [catalogProducts, setCatalogProducts] = useState<CatalogProductLite[]>(
    [],
  );
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [prices, setPrices] = useState<StoreProductPriceRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [customPriceInput, setCustomPriceInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setLoadingCatalog(true);
      const response = await fetch("/api/admin/products");
      const data = await response.json();
      if (!cancelled) {
        if (response.ok) {
          setCatalogProducts(data.products ?? []);
        } else {
          onError(data.error || "שגיאה בטעינת מוצרים");
        }
        setLoadingCatalog(false);
      }
    }

    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  useEffect(() => {
    let cancelled = false;

    async function loadPrices() {
      setLoadingPrices(true);
      const response = await fetch(
        `/api/admin/stores/${storeId}/product-prices`,
      );
      const data = await response.json();
      if (!cancelled) {
        if (response.ok) {
          setPrices(data.prices ?? []);
          onDiscountAppliesChange(
            Boolean(data.discountAppliesToCustomPrices),
          );
        } else {
          onError(data.error || "שגיאה בטעינת מחירים מיוחדים");
        }
        setLoadingPrices(false);
      }
    }

    void loadPrices();
    return () => {
      cancelled = true;
    };
  }, [storeId, onError]);

  const searchMatch = useMemo(
    () => findProductByAdminQuery(catalogProducts, searchQuery),
    [catalogProducts, searchQuery],
  );

  async function toggleDiscountOnCustom(next: boolean) {
    onDiscountAppliesChange(next);
    const response = await fetch("/api/admin/stores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: storeId,
        discountAppliesToCustomPrices: next,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      onDiscountAppliesChange(!next);
      onError(data.error || "שגיאה בשמירת הגדרת הנחה");
      return;
    }
    onMessage(next ? "אחוז הנחה יחול גם על מחירים מיוחדים" : "אחוז הנחה לא יחול על מחירים מיוחדים");
  }

  async function addCustomPrice() {
    if (!searchMatch) {
      onError("לא נמצא מוצר — חפש לפי שם או מק\"ט");
      return;
    }

    const parsed = Number.parseFloat(customPriceInput.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
      onError("הזן מחיר תקין");
      return;
    }

    setSaving(true);
    onError("");
    const response = await fetch(
      `/api/admin/stores/${storeId}/product-prices`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: searchMatch.itemId,
          customPrice: parsed,
        }),
      },
    );
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      onError(data.error || "שגיאה בשמירת מחיר");
      return;
    }

    const saved = data.price as StoreProductPriceRow;
    setPrices((prev) => {
      const without = prev.filter((p) => p.itemId !== saved.itemId);
      return [saved, ...without];
    });
    setSearchQuery("");
    setCustomPriceInput("");
    onMessage(`נשמר מחיר מיוחד: ${saved.name}`);
  }

  async function removeCustomPrice(itemId: number) {
    setSaving(true);
    onError("");
    const response = await fetch(
      `/api/admin/stores/${storeId}/product-prices`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      },
    );
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      onError(data.error || "שגיאה במחיקה");
      return;
    }

    setPrices((prev) => prev.filter((p) => p.itemId !== itemId));
    onMessage("מחיר מיוחד הוסר");
  }

  return (
    <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/50 p-3">
      <p className="text-sm font-semibold text-sky-900">מחירים מיוחדים למוצרים</p>
      <p className="mt-1 text-xs text-sky-800">
        חפש מוצר לפי שם, מק&quot;ט או משפחת שפות — והגדר מחיר קבוע ללקוח הזה.
        {discountPercent > 0
          ? " כברירת מחדל אחוז ההנחה לא חל על מוצרים עם מחיר מיוחד."
          : null}
      </p>

      <label className="mt-3 flex items-start gap-2 text-xs text-sky-900">
        <input
          type="checkbox"
          checked={discountAppliesToCustomPrices}
          onChange={(e) => void toggleDiscountOnCustom(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          החל גם את אחוז ההנחה ({discountPercent}%) על מוצרים במחיר מיוחד
        </span>
      </label>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='חיפוש מוצר — למשל "באש ובמים" או מק"ט'
          disabled={loadingCatalog || saving}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          step={0.01}
          value={customPriceInput}
          onChange={(e) => setCustomPriceInput(e.target.value)}
          placeholder="מחיר ₪"
          disabled={saving}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm sm:w-28"
        />
        <button
          type="button"
          disabled={saving || loadingCatalog || !searchMatch}
          onClick={() => void addCustomPrice()}
          className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "שומר..." : "הוסף"}
        </button>
      </div>

      {searchQuery.trim() && searchMatch && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-sky-200 bg-white p-2">
          {searchMatch.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={searchMatch.image}
              alt=""
              className="h-10 w-10 rounded object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-[10px] text-gray-500">
              אין
            </div>
          )}
          <div className="min-w-0 text-xs">
            <p className="truncate font-medium">{searchMatch.name}</p>
            <p className="text-gray-500">
              מק&quot;ט {searchMatch.sku} · מחיר קטלוג{" "}
              {formatNis(searchMatch.price)}
            </p>
          </div>
        </div>
      )}

      {searchQuery.trim() && !searchMatch && !loadingCatalog && (
        <p className="mt-2 text-xs text-red-600">לא נמצא מוצר</p>
      )}

      {loadingPrices ? (
        <p className="mt-3 text-xs text-gray-600">טוען מחירים מיוחדים...</p>
      ) : prices.length === 0 ? (
        <p className="mt-3 text-xs text-gray-600">אין עדיין מחירים מיוחדים.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {prices.map((row) => (
            <li
              key={row.itemId}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.name}</p>
                <p className="text-xs text-gray-500">
                  מק&quot;ט {row.sku} · קטלוג {formatNis(row.catalogPrice)} →{" "}
                  <span className="font-semibold text-sky-800">
                    {formatNis(row.customPrice)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void removeCustomPrice(row.itemId)}
                className="shrink-0 text-xs text-red-600"
              >
                הסר
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function StoresPageClient() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStoreName, setEditStoreName] = useState("");
  const [editDiscount, setEditDiscount] = useState("0");
  const [editDiscountOnCustom, setEditDiscountOnCustom] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [createStoreName, setCreateStoreName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createDiscount, setCreateDiscount] = useState("0");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ordersStore, setOrdersStore] = useState<StoreRow | null>(null);

  async function loadStores() {
    const response = await fetch("/api/admin/stores");
    const data = await response.json();
    if (response.ok) {
      setStores(data.stores ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadStores();
  }, []);

  async function createStore(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setCreating(true);

    const response = await fetch("/api/admin/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeName: createStoreName.trim(),
        password: createPassword.trim(),
        discountPercent: createDiscount.trim(),
      }),
    });

    const data = await response.json();
    setCreating(false);

    if (!response.ok) {
      setError(data.error || "שגיאה ביצירת חנות");
      return;
    }

    setMessage(`נוצרה חנות: ${data.store.store_name}`);
    setCreateStoreName("");
    setCreatePassword("");
    setCreateDiscount("0");
    await loadStores();
  }

  async function saveStore(store: StoreRow) {
    setError("");
    setMessage("");

    const body: Record<string, string | number | boolean> = { id: store.id };
    if (editStoreName.trim() !== store.store_name) {
      body.storeName = editStoreName.trim();
    }
    if (newPassword.trim()) {
      body.password = newPassword.trim();
    }
    const discountValue = Number.parseFloat(editDiscount.replace(",", "."));
    const currentDiscount = Number(store.discount_percent ?? 0);
    if (
      Number.isFinite(discountValue) &&
      discountValue !== currentDiscount
    ) {
      body.discountPercent = discountValue;
    }
    if (
      editDiscountOnCustom !==
      Boolean(store.discount_applies_to_custom_prices)
    ) {
      body.discountAppliesToCustomPrices = editDiscountOnCustom;
    }

    if (Object.keys(body).length === 1) {
      setError("לא בוצע שינוי");
      return;
    }

    const response = await fetch("/api/admin/stores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "שגיאה");
      return;
    }

    setMessage(`עודכן: ${data.store.store_name}`);
    setEditId(null);
    setNewPassword("");
    await loadStores();
  }

  function startEdit(store: StoreRow) {
    setEditId(store.id);
    setEditStoreName(store.store_name);
    setEditDiscount(String(store.discount_percent ?? 0));
    setEditDiscountOnCustom(Boolean(store.discount_applies_to_custom_prices));
    setNewPassword("");
    setMessage("");
    setError("");
  }

  const editingStore = stores.find((s) => s.id === editId) ?? null;
  const editingDiscount = Number.parseFloat(editDiscount.replace(",", ".")) || 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">יצירת חנות ללקוח</h2>
        <p className="mt-2 text-sm text-gray-600">
          הגדר שם חנות, סיסמה ואחוז הנחה. שלח ללקוח את הקישור לכניסה.
        </p>

        <form onSubmit={createStore} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium">שם חנות</label>
            <input
              value={createStoreName}
              onChange={(e) => setCreateStoreName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">סיסמה</label>
            <input
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              required
              minLength={4}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">
              אחוז הנחה (0–100)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={createDiscount}
              onChange={(e) => setCreateDiscount(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60"
            >
              {creating ? "יוצר..." : "צור חנות"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">חנויות שנרשמו / התחברו</h2>
        <p className="mt-2 text-sm text-gray-600">
          רשימת לקוחות שנכנסו דרך הקישור — עריכה, הנחה, מחירים מיוחדים והזמנות.
        </p>

        {message && (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-6">טוען...</p>
        ) : stores.length === 0 ? (
          <p className="mt-6 text-gray-600">עדיין אין חנויות.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {stores.map((store) =>
              editId === store.id ? (
                <div
                  key={store.id}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs">שם חנות</label>
                      <input
                        value={editStoreName}
                        onChange={(e) => setEditStoreName(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs">אחוז הנחה</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={editDiscount}
                        onChange={(e) => setEditDiscount(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs">
                        סיסמה חדשה (אופציונלי)
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="השאר ריק אם לא משנים"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </div>
                  </div>

                  {editingStore && (
                    <StoreProductPricingPanel
                      storeId={editingStore.id}
                      discountPercent={editingDiscount}
                      discountAppliesToCustomPrices={editDiscountOnCustom}
                      onDiscountAppliesChange={setEditDiscountOnCustom}
                      onError={setError}
                      onMessage={setMessage}
                    />
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveStore(store)}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-white"
                    >
                      שמור
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      className="text-gray-500"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={store.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {store.store_name}
                        </span>
                        {(store.discount_percent ?? 0) > 0 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                            הנחה {store.discount_percent}%
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(store.created_at).toLocaleString("he-IL")}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setOrdersStore(store)}
                        className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800"
                      >
                        הזמנות
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(store)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        ערוך
                      </button>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      {ordersStore && (
        <StoreOrdersModal
          storeId={ordersStore.id}
          storeName={ordersStore.store_name}
          onClose={() => setOrdersStore(null)}
        />
      )}
    </div>
  );
}
