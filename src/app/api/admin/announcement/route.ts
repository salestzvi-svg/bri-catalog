import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth";

function tableMissingMessage(errorMessage: string) {
  if (errorMessage.includes("announcements")) {
    return "טבלת המודעות לא קיימת — הרץ את הקובץ migration-add-announcements.sql ב-Supabase SQL Editor";
  }
  return errorMessage;
}

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("message, image_url, is_active, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: tableMissingMessage(error.message) },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: data?.message ?? "",
    imageUrl: data?.image_url ?? "",
    isActive: data?.is_active ?? false,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PUT(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { message, imageUrl, isActive } = await request.json();
  const trimmedMessage = String(message ?? "").trim();
  const trimmedImageUrl = String(imageUrl ?? "").trim();

  if (Boolean(isActive) && !trimmedMessage && !trimmedImageUrl) {
    return NextResponse.json(
      { error: "יש להזין טקסט או להעלות תמונה לפני הפעלת המודעה" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("announcements")
    .upsert(
      {
        id: 1,
        message: trimmedMessage,
        image_url: trimmedImageUrl || null,
        is_active: Boolean(isActive),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("message, image_url, is_active, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: tableMissingMessage(error.message) },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: data.message,
    imageUrl: data.image_url ?? "",
    isActive: data.is_active,
    updatedAt: data.updated_at,
  });
}
