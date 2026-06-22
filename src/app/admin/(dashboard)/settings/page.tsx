"use client";

import { useEffect, useState } from "react";
import AnnouncementManager from "@/components/AnnouncementManager";
import RegularAdminPasswordCard from "@/components/RegularAdminPasswordCard";

export default function SettingsPage() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/admin/me")
      .then((r) => r.json())
      .then((d) => setIsSuperAdmin(d.isSuperAdmin === true))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-500">טוען...</p>;
  }

  return (
    <div className="space-y-6">
      <AnnouncementManager />
      {isSuperAdmin && <RegularAdminPasswordCard />}
    </div>
  );
}
