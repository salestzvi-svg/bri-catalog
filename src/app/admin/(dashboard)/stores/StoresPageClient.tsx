"use client";

import { useEffect, useState } from "react";
import StoreOrdersModal from "@/components/StoreOrdersModal";

interface StoreRow {
  id: string;
  store_name: string;
  username: string;
  created_at: string;
  discount_percent?: number;
}

export default function StoresPageClient() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStoreName, setEditStoreName] = useState("");
  const [editDiscount, setEditDiscount] = useState("0");
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

    const body: Record<string, string | number> = { id: store.id };
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
    setNewPassword("");
    setMessage("");
    setError("");
  }

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
          רשימת לקוחות שנכנסו דרך הקישור — עריכה, הנחה והזמנות.
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
