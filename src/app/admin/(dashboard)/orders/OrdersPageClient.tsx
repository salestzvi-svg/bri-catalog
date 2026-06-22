"use client";

import { useEffect, useMemo, useState } from "react";
import type { StoreOrder, WhatsAppChannel } from "@/lib/types";
import {
  formatOrderPrice,
  STORE_ORDERS_MAX_RETAINED,
} from "@/lib/store-orders";

interface StoreOption {
  id: string;
  store_name: string;
  username: string;
}

function ChannelLabel({ channel }: { channel: WhatsAppChannel }) {
  if (channel === "b") {
    return (
      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
        קישור 2
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
      קישור 1
    </span>
  );
}

export default function OrdersPageClient({
  isSuperAdmin,
}: {
  isSuperAdmin: boolean;
}) {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeFilter, setStoreFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    if (!isSuperAdmin) return;

    fetch("/api/admin/stores")
      .then((r) => r.json())
      .then((d) => setStores(d.stores ?? []))
      .catch(() => {});
  }, [isSuperAdmin]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const url = storeFilter
          ? `/api/admin/orders?storeId=${encodeURIComponent(storeFilter)}`
          : "/api/admin/orders";
        const response = await fetch(url);
        const data = await response.json();
        if (cancelled) return;

        if (!response.ok) {
          setError(data.error || "שגיאה בטעינת הזמנות");
          setOrders([]);
          return;
        }

        setOrders(data.orders ?? []);
        setTotalSpent(Number(data.totalSpent ?? 0));
      } catch {
        if (!cancelled) {
          setError("שגיאת רשת");
          setOrders([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [storeFilter]);

  const orderCount = orders.length;

  const storeLabel = useMemo(() => {
    if (!storeFilter) return "כל החנויות";
    const store = stores.find((s) => s.id === storeFilter);
    return store ? `${store.store_name} (${store.username})` : "חנות נבחרת";
  }, [storeFilter, stores]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold">
        {isSuperAdmin ? "הזמנות לקוחות" : "הזמנות — קישור 2"}
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        {isSuperAdmin
          ? "כל ההזמנות שנשלחו ל-WhatsApp משני הקישורים — עם תיוג קישור 1 / קישור 2."
          : "הזמנות מלקוחות שנכנסו דרך קישור 2 (/b/login) בלבד."}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        ההזמנות נשמרות בטבלה נפרדת ולא משפיעות על מהירות הקטלוג. נשמרות עד{" "}
        {STORE_ORDERS_MAX_RETAINED} הזמנות אחרונות לכל קישור — ישנות נמחקות
        אוטומטית.
      </p>

      {isSuperAdmin && (
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            סינון לפי חנות
          </label>
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm sm:max-w-md"
          >
            <option value="">כל החנויות</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.store_name} — {store.username}
              </option>
            ))}
          </select>
        </div>
      )}

      {!loading && !error && orderCount > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {isSuperAdmin && (
            <span className="rounded-lg bg-gray-100 px-3 py-1.5">
              {storeLabel}
            </span>
          )}
          <span className="rounded-lg bg-gray-100 px-3 py-1.5">
            {orderCount} הזמנות
          </span>
          {totalSpent > 0 && (
            <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800">
              סה״כ: {formatOrderPrice(totalSpent)}
            </span>
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-gray-600">טוען הזמנות...</p>
      ) : !error && orderCount === 0 ? (
        <p className="mt-6 text-gray-600">
          {isSuperAdmin
            ? "עדיין אין הזמנות שמורות. הזמנות יופיעו כאן מרגע שליחה ל-WhatsApp."
            : "עדיין אין הזמנות מקישור 2. הזמנות יופיעו כאן מרגע שליחה ל-WhatsApp."}
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-xl border border-gray-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900">{order.store_name}</p>
                  <p className="text-sm text-gray-600">
                    משתמש: {order.username}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleString("he-IL")}
                  </p>
                </div>
                {isSuperAdmin && (
                  <ChannelLabel channel={order.whatsapp_channel} />
                )}
              </div>

              <ul className="mt-3 space-y-2 text-sm">
                {order.items.map((item) => (
                  <li
                    key={`${order.id}-${item.sku}`}
                    className="flex justify-between gap-2 border-b border-gray-50 pb-2"
                  >
                    <span className="min-w-0 flex-1">
                      {item.name}
                      <span className="block text-xs text-gray-500">
                        מק&quot;ט {item.sku} × {item.quantity}
                      </span>
                    </span>
                    {item.lineTotal !== null && item.lineTotal > 0 && (
                      <span className="shrink-0 font-medium text-emerald-700">
                        {formatOrderPrice(item.lineTotal)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {order.total_amount > 0 && (
                <p className="mt-3 text-sm font-bold text-emerald-800">
                  סה״כ: {formatOrderPrice(order.total_amount)}
                </p>
              )}

              {order.notes && (
                <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  הערות: {order.notes}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
