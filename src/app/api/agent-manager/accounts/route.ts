import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hashPassword, requireAgentManagerSession } from "@/lib/auth";
import { fetchRivhitAgents } from "@/lib/rivhit-documents";

export async function GET() {
  const session = await requireAgentManagerSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const [{ data: accounts, error }, rivhitAgents] = await Promise.all([
      supabase
        .from("agent_accounts")
        .select(
          "id, username, rivhit_agent_id, rivhit_agent_name, is_active, created_at",
        )
        .order("created_at", { ascending: false }),
      fetchRivhitAgents(),
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      accounts: accounts ?? [],
      rivhitAgents: rivhitAgents.map((a) => ({
        id: a.customer_id,
        name:
          (a.last_name ?? "").trim() ||
          (a.first_name ?? "").trim() ||
          `#${a.customer_id}`,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "שגיאה בטעינת סוכנים",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await requireAgentManagerSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { username, password, rivhitAgentId } = await request.json();

  if (!username?.trim() || !password?.trim() || !rivhitAgentId) {
    return NextResponse.json(
      { error: "יש למלא שם משתמש, סיסמה וסוכן מריווחית" },
      { status: 400 },
    );
  }

  try {
    const agents = await fetchRivhitAgents();
    const agent = agents.find((a) => a.customer_id === Number(rivhitAgentId));
    if (!agent) {
      return NextResponse.json(
        { error: "הסוכן לא נמצא בריווחית" },
        { status: 400 },
      );
    }

    const agentName =
      (agent.last_name ?? "").trim() ||
      (agent.first_name ?? "").trim() ||
      `#${agent.customer_id}`;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("agent_accounts")
      .insert({
        username: username.trim(),
        password_hash: await hashPassword(password),
        rivhit_agent_id: agent.customer_id,
        rivhit_agent_name: agentName,
      })
      .select(
        "id, username, rivhit_agent_id, rivhit_agent_name, is_active, created_at",
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "שם המשתמש כבר קיים" },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ account: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה ביצירה" },
      { status: 500 },
    );
  }
}
