import { redirect } from "next/navigation";
import StoreLoginForm from "@/components/StoreLoginForm";
import { requireStoreSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await requireStoreSession();
  if (session) {
    redirect("/catalog");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-emerald-50 px-4 py-8">
      <StoreLoginForm />
    </main>
  );
}
