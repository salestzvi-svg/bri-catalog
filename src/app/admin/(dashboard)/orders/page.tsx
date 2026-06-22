import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth";
import OrdersPageClient from "./OrdersPageClient";

export default async function OrdersPage() {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <OrdersPageClient isSuperAdmin={session.role === "super_admin"} />
  );
}
