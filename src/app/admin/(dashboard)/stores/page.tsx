import { redirect } from "next/navigation";
import { requireSuperAdminSession } from "@/lib/auth";
import StoresPageClient from "./StoresPageClient";

export default async function StoresPage() {
  const session = await requireSuperAdminSession();
  if (!session) {
    redirect("/admin");
  }

  return <StoresPageClient />;
}
