"use client";

import { useEffect, useState } from "react";
import type { WhatsAppChannel } from "@/lib/types";

const STORAGE_KEY = "catalog_store_login";

export default function StoreLoginForm({
  channel = "default",
}: {
  channel?: WhatsAppChannel;
}) {
  const [storeName, setStoreName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          storeName?: string;
          username?: string;
        };
        if (parsed.storeName) setStoreName(parsed.storeName);
        if (parsed.username) setUsername(parsed.username);
      }
    } catch {
      // ignore
    }
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/store/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName, username, password, channel }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "שגיאה");
        return;
      }

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          storeName: storeName.trim(),
          username: username.trim(),
        }),
      );

      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key?.startsWith("announcement_dismissed_")) {
          sessionStorage.removeItem(key);
        }
      }

      window.location.href = "/catalog";
    } catch {
      setError("שגיאת רשת. נסה שוב.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
      <h1 className="mb-2 text-center text-2xl font-bold text-emerald-800">
        כניסה לקטלוג
      </h1>
      <p className="mb-6 text-center text-sm text-gray-600">
        פעם ראשונה? הזינו פרטים ובחרו סיסמה — ונכנסים ישר.
        <br />
        חוזרים? אותם פרטים + הסיסמה שבחרתם.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
        <div>
          <label className="mb-1 block text-sm font-medium">שם החנות</label>
          <input
            type="text"
            name="store-name"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            autoComplete="organization"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base"
            placeholder="למשל: מינימרק השכונה"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">שם משתמש</label>
          <input
            type="text"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base"
            placeholder="למשל: דוד"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">סיסמה</label>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base"
            placeholder="סיסמה לבחירתכם"
            required
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white disabled:opacity-60"
        >
          {loading ? "נכנס..." : "כניסה"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500">
        המכשיר יזכור שם חנות ומשתמש לפעם הבאה.
      </p>
    </div>
  );
}
