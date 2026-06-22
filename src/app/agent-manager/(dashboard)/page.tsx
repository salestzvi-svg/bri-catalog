"use client";

import { useEffect, useState } from "react";
import type { AgentAccount } from "@/lib/types";
import PasswordField from "@/components/PasswordField";

interface RivhitAgentOption {
  id: number;
  name: string;
}

export default function AgentManagerPage() {
  const [accounts, setAccounts] = useState<AgentAccount[]>([]);
  const [rivhitAgents, setRivhitAgents] = useState<RivhitAgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rivhitAgentId, setRivhitAgentId] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/agent-manager/accounts");
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "שגיאה בטעינה");
        return;
      }
      setAccounts(data.accounts ?? []);
      setRivhitAgents(data.rivhitAgents ?? []);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createAccount() {
    setFeedback("");
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/agent-manager/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rivhitAgentId: Number(rivhitAgentId) }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "שגיאה");
        return;
      }
      setUsername("");
      setPassword("");
      setRivhitAgentId("");
      setFeedback("חשבון הסוכן נוצר");
      await load();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(account: AgentAccount) {
    const response = await fetch(`/api/agent-manager/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !account.is_active }),
    });
    if (response.ok) await load();
  }

  async function resetPassword(account: AgentAccount) {
    const newPassword = prompt(`סיסמה חדשה ל-${account.username}:`);
    if (!newPassword?.trim()) return;
    const response = await fetch(`/api/agent-manager/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    const data = await response.json();
    if (response.ok) {
      setFeedback(`סיסמה עודכנה ל-${account.username}`);
    } else {
      alert(data.error || "שגיאה");
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">טוען...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">יצירת חשבון סוכן</h2>
        <p className="mt-1 text-sm text-gray-600">
          בחר סוכן מריווחית (חייב להיות קיים שם) וקבע שם משתמש וסיסמה.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">שם משתמש</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">סיסמה</label>
            <PasswordField
              value={password}
              onChange={setPassword}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm">סוכן בריווחית</label>
            <select
              value={rivhitAgentId}
              onChange={(e) => setRivhitAgentId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
            >
              <option value="">בחר סוכן...</option>
              {rivhitAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} (#{agent.id})
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {feedback && (
          <p className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            {feedback}
          </p>
        )}
        <button
          type="button"
          disabled={saving || !username || !password || !rivhitAgentId}
          onClick={createAccount}
          className="mt-4 rounded-xl bg-indigo-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "שומר..." : "צור חשבון סוכן"}
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">חשבונות קיימים</h2>
        {accounts.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">אין חשבונות עדיין</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4"
              >
                <div>
                  <p className="font-semibold">{account.username}</p>
                  <p className="text-sm text-gray-600">
                    ריווחית: {account.rivhit_agent_name} (#{account.rivhit_agent_id})
                  </p>
                  <p className="text-xs text-gray-500">
                    {account.is_active ? "פעיל" : "מושבת"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => resetPassword(account)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs"
                  >
                    איפוס סיסמה
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(account)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs"
                  >
                    {account.is_active ? "השבת" : "הפעל"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-900">
        <p className="font-semibold">כניסת סוכנים:</p>
        <p className="mt-1">/agent/login</p>
      </div>
    </div>
  );
}
