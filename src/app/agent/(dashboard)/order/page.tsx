import { requireAgentSession } from "@/lib/auth";
import AgentOrderView from "@/components/AgentOrderView";

export default async function AgentOrderPage() {
  const session = await requireAgentSession();
  return (
    <AgentOrderView
      agentName={session!.rivhitAgentName ?? session!.username ?? "סוכן"}
      rivhitAgentId={session!.rivhitAgentId!}
    />
  );
}
