"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PasswordField from "@/components/PasswordField";

export default function AgentManagerLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/agent-manager/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "שגיאה");
        return;
      }
      router.push("/agent-manager");
      router.refresh();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
      >
        <h1 className="mb-2 text-center text-2xl font-bold text-indigo-800">
          כניסת מנהל סוכנים
        </h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          ניהול חשבונות סוכנים
        </p>
        <label className="mb-1 block text-sm font-medium">סיסמה</label>
        <PasswordField
          value={password}
          onChange={setPassword}
          className="mb-4 w-full rounded-xl border border-gray-300 px-4 py-3"
          required
        />
        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-700 py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "מתחבר..." : "התחבר"}
        </button>
      </form>
    </main>
  );
}
