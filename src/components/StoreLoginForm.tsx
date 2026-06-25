"use client";

import { useEffect, useState } from "react";
import { useStoreLocale } from "@/hooks/useStoreLocale";
import type { WhatsAppChannel } from "@/lib/types";

const STORAGE_KEY = "catalog_store_login";

export default function StoreLoginForm({
  channel = "default",
}: {
  channel?: WhatsAppChannel;
}) {
  const { t, dir, locale, toggleLocale } = useStoreLocale();
  const [storeName, setStoreName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { storeName?: string };
        if (parsed.storeName) setStoreName(parsed.storeName);
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
        body: JSON.stringify({ storeName, password, channel }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || t.networkError);
        return;
      }

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ storeName: storeName.trim() }),
      );

      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key?.startsWith("announcement_dismissed_")) {
          sessionStorage.removeItem(key);
        }
      }

      window.location.href = "/catalog";
    } catch {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir={dir} lang={locale} className="mx-auto w-full max-w-md">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={toggleLocale}
          className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800"
          aria-label={t.languageAria}
        >
          {t.language}
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-emerald-800">
          {t.loginTitle}
        </h1>
        <p className="mb-6 whitespace-pre-line text-center text-sm text-gray-600">
          {t.loginSubtitle}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          <div>
            <label className="mb-1 block text-sm font-medium">{t.storeName}</label>
            <input
              type="text"
              name="store-name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              autoComplete="organization"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base"
              placeholder={t.storeNamePlaceholder}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t.password}</label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base"
              placeholder={t.passwordPlaceholder}
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
            {loading ? t.loginLoading : t.loginButton}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500">{t.loginRemember}</p>
      </div>
    </div>
  );
}
