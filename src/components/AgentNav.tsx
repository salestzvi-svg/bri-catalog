"use client";

import { useRouter } from "next/navigation";

export default function AgentNav({ agentName }: { agentName: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/agent/logout", { method: "POST" });
    router.push("/agent/login");
    router.refresh();
  }

  return (
    <header className="border-b border-indigo-100 bg-white shadow-sm">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">סוכן</p>
          <h1 className="truncate text-base font-bold text-indigo-800">
            {agentName}
          </h1>
        </div>
        <button
          onClick={logout}
          className="shrink-0 rounded-lg border border-gray-300 px-2 py-2 text-xs"
        >
          יציאה
        </button>
      </div>
    </header>
  );
}
