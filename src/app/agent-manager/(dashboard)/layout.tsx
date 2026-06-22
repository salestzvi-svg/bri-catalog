import { redirect } from "next/navigation";
import AgentManagerNav from "@/components/AgentManagerNav";
import { requireAgentManagerSession } from "@/lib/auth";

export default async function AgentManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAgentManagerSession();
  if (!session) {
    redirect("/agent-manager/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AgentManagerNav />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
