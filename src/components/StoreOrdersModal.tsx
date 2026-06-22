"use client";

import { useEffect, useState } from "react";
import type { StoreOrder, WhatsAppChannel } from "@/lib/types";

function formatPrice(price: number) {
  return `₪${price.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
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

export default function StoreOrdersModal({
  storeId,
  storeName,
  onClose,
}: {
  storeId: string;
  storeName: string;
  onClose: () => void;
}) {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/admin/stores/${storeId}/orders`);
        const data = await response.json();
        if (cancelled) return;

        if (!response.ok) {
          setError(data.error || "שגיאה בטעינת הזמנות");
          return;
        }

        setOrders(data.orders ?? []);
        setTotalSpent(Number(data.totalSpent ?? 0));
      } catch {
        if (!cancelled) setError("שגיאת רשת");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full flex-col rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-gray-100 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">היסטוריית הזמנות</h3>
              <p className="mt-1 text-sm text-gray-600">{storeName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-gray-500"
            >
              סגור
            </button>
          </div>

          {!loading && !error && orders.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <span className="rounded-lg bg-gray-100 px-3 py-1">
                {orders.length} הזמנות
              </span>
              {totalSpent > 0 && (
                <span className="rounded-lg bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
                  סה״כ: {formatPrice(totalSpent)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className="text-sm text-gray-500">טוען הזמנות...</p>}

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {!loading && !error && orders.length === 0 && (
            <p className="text-sm text-gray-600">
              עדיין אין הזמנות שמורות. הזמנות יופיעו כאן מרגע שליחה ל-WhatsApp.
            </p>
          )}

          {!loading && !error && orders.length > 0 && (
            <div className="space-y-4">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(order.created_at).toLocaleString("he-IL")}
                    </p>
                    <ChannelLabel channel={order.whatsapp_channel} />
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
                            {formatPrice(item.lineTotal)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {order.total_amount > 0 && (
                    <p className="mt-3 text-sm font-bold text-emerald-800">
                      סה״כ: {formatPrice(order.total_amount)}
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
      </div>
    </div>
  );
}
