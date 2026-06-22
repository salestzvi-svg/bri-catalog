"use client";

import { useState } from "react";

export default function RegularAdminPasswordCard() {
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/regular-admin-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "שגיאה");
        return;
      }
      setMessage("סיסמת המנהל הרגיל עודכנה");
      setNewPassword("");
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">סיסמת מנהל רגיל</h2>
      <p className="mt-1 text-sm text-gray-600">
        קבע סיסמה חדשה למנהל שנכנס דרך /admin/login
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm">סיסמה חדשה למנהל רגיל</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
            required
            minLength={6}
          />
        </div>
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-amber-700 py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "שומר..." : "עדכן סיסמת מנהל רגיל"}
        </button>
      </form>
    </div>
  );
}
