import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { setSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "יש להזין שם משתמש וסיסמה" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("agent_accounts")
      .select("*")
      .eq("username", username.trim())
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: "שם משתמש או סיסמה שגויים" },
        { status: 401 },
      );
    }

    if (!data.is_active) {
      return NextResponse.json(
        { error: "חשבון הסוכן אינו פעיל" },
        { status: 403 },
      );
    }

    const valid = await verifyPassword(password, data.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "שם משתמש או סיסמה שגויים" },
        { status: 401 },
      );
    }

    await setSession({
      role: "agent",
      username: data.username,
      agentAccountId: data.id,
      rivhitAgentId: data.rivhit_agent_id,
      rivhitAgentName: data.rivhit_agent_name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בהתחברות" },
      { status: 500 },
    );
  }
}
