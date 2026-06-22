"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/agent-manager", label: "חשבונות סוכנים" },
  { href: "/agent-manager/settings", label: "הגדרות" },
];

export default function AgentManagerNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/agent-manager/logout", { method: "POST" });
    router.push("/agent-manager/login");
    router.refresh();
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <p className="text-xs text-gray-500">מנהל סוכנים</p>
          <h1 className="text-xl font-bold text-indigo-800">קטלוג כוונת הלב</h1>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          יציאה
        </button>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${
              pathname === link.href
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
