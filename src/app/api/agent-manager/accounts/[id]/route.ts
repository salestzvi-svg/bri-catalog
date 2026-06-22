import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hashPassword, requireAgentManagerSession } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAgentManagerSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { id } = await params;
  const { password, isActive } = await request.json();
  const updates: Record<string, unknown> = {};

  if (typeof isActive === "boolean") {
    updates.is_active = isActive;
  }
  if (password?.trim()) {
    updates.password_hash = await hashPassword(password);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "אין מה לעדכן" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_accounts")
    .update(updates)
    .eq("id", id)
    .select(
      "id, username, rivhit_agent_id, rivhit_agent_name, is_active, created_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ account: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAgentManagerSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("agent_accounts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
