"use client";

import { useEffect, useState } from "react";
import StoreOrdersModal from "@/components/StoreOrdersModal";
import type { WhatsAppChannel } from "@/lib/types";

interface StoreRow {
  id: string;
  store_name: string;
  username: string;
  created_at: string;
  signup_channel?: WhatsAppChannel;
  last_login_channel?: WhatsAppChannel;
}

function ChannelBadge({ channel }: { channel: WhatsAppChannel | undefined }) {
  const value = channel ?? "default";

  if (value === "b") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800">
        קישור 2
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
      קישור 1
    </span>
  );
}

export default function StoresPageClient() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStoreName, setEditStoreName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ordersStore, setOrdersStore] = useState<StoreRow | null>(null);

  async function loadStores() {
    const response = await fetch("/api/admin/stores");
    const data = await response.json();
    if (response.ok) {
      setStores(data.stores ?? []);
      setTrackingEnabled(data.trackingEnabled !== false);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadStores();
  }, []);

  async function saveStore(store: StoreRow) {
    setError("");
    setMessage("");

    const body: Record<string, string> = { id: store.id };
    if (editStoreName.trim() !== store.store_name) {
      body.storeName = editStoreName.trim();
    }
    if (editUsername.trim() !== store.username) {
      body.username = editUsername.trim();
    }
    if (newPassword.trim()) {
      body.password = newPassword.trim();
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

    setMessage(`עודכן: ${data.store.store_name} / ${data.store.username}`);
    setEditId(null);
    setNewPassword("");
    await loadStores();
  }

  function startEdit(store: StoreRow) {
    setEditId(store.id);
    setEditStoreName(store.store_name);
    setEditUsername(store.username);
    setNewPassword("");
    setMessage("");
    setError("");
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold">חנויות שנרשמו</h2>
      <p className="mt-2 text-sm text-gray-600">
        עריכת שם חנות, שם משתמש ואיפוס סיסמה ללקוחות.
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>קישור כניסה:</span>
        <ChannelBadge channel="default" />
        <span>WhatsApp ראשי</span>
        <ChannelBadge channel="b" />
        <span>WhatsApp שני</span>
      </p>

      {!trackingEnabled && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          מעקב הקישורים לא פעיל — הרץ את קובץ ה-SQL ב-Supabase (ראה הודעה קודמת).
        </p>
      )}

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
        <p className="mt-6 text-gray-600">עדיין אין חנויות רשומות.</p>
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
                    <label className="mb-1 block text-xs">שם משתמש</label>
                    <input
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
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
                      <ChannelBadge channel={store.last_login_channel} />
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      משתמש: {store.username}
                    </p>
                    {store.signup_channel &&
                      store.signup_channel !== store.last_login_channel && (
                        <p className="mt-1 text-xs text-gray-500">
                          נרשם בקישור{" "}
                          {store.signup_channel === "b" ? "2" : "1"}
                        </p>
                      )}
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
