import { redirect } from "next/navigation";
import { requireAgentSession } from "@/lib/auth";

export default async function AgentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAgentSession();
  if (!session) {
    redirect("/agent/login");
  }

  return <>{children}</>;
}
