import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  hashPassword,
  requireAgentManagerSession,
  verifyPassword,
} from "@/lib/auth";

export async function PUT(request: Request) {
  const session = await requireAgentManagerSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword?.trim() || !newPassword?.trim()) {
    return NextResponse.json(
      { error: "יש למלא סיסמה נוכחית וחדשה" },
      { status: 400 },
    );
  }

  if (newPassword.trim().length < 6) {
    return NextResponse.json(
      { error: "הסיסמה החדשה חייבת להכיל לפחות 6 תווים" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_manager_settings")
    .select("password_hash")
    .eq("id", 1)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "הגדרות לא נמצאו" }, { status: 500 });
  }

  const valid = await verifyPassword(currentPassword, data.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "סיסמה נוכחית שגויה" }, { status: 401 });
  }

  const { error: updateError } = await supabase
    .from("agent_manager_settings")
    .update({
      password_hash: await hashPassword(newPassword.trim()),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
