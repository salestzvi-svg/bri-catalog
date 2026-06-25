import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth";
import StoresPageClient from "./StoresPageClient";

export default async function StoresPage() {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return <StoresPageClient />;
}
