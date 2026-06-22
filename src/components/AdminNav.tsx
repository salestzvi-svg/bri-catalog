"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/admin", label: "קטלוג" },
  { href: "/admin/orders", label: "הזמנות" },
  { href: "/admin/stores", label: "חנויות", superAdminOnly: true },
  { href: "/admin/settings", label: "הגדרות" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/admin/me")
      .then((r) => r.json())
      .then((d) => setIsSuperAdmin(d.isSuperAdmin === true))
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/auth/admin/logout", { method: "POST" });
    router.push(isSuperAdmin ? "/super-admin/login" : "/admin/login");
    router.refresh();
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <p className="text-xs text-gray-500">
            {isSuperAdmin ? "מנהל ראשי" : "לוח מנהל"}
          </p>
          <h1 className="text-xl font-bold text-emerald-800">
            קטלוג כוונת הלב
          </h1>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          יציאה
        </button>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
        {links
          .filter((link) => !link.superAdminOnly || isSuperAdmin)
          .map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${
              pathname === link.href
                ? "bg-emerald-600 text-white"
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
