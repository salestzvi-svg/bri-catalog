import { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function GET() {
  const config = getSupabaseConfig();

  if (!config.isConfigured) {
    return NextResponse.json({
      ok: false,
      step: "env",
      message: "חסרים משתני Supabase ב-Vercel",
      urlHost: config.urlHost,
      hasServiceKey: Boolean(config.key),
    });
  }

  try {
    const response = await fetch(
      `${config.url}/rest/v1/admin_settings?id=eq.1&select=id`,
      {
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
        },
        cache: "no-store",
      },
    );

    const body = await response.text();

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        step: "supabase",
        message: "Supabase החזיר שגיאה",
        urlHost: config.urlHost,
        status: response.status,
        body: body.slice(0, 200),
      });
    }

    const rows = JSON.parse(body) as { id: number }[];

    return NextResponse.json({
      ok: rows.length > 0,
      step: rows.length > 0 ? "ready" : "schema",
      message:
        rows.length > 0
          ? "החיבור תקין — מנהל אמור לעבוד"
          : "החיבור תקין אבל admin_settings ריק — הרץ schema.sql",
      urlHost: config.urlHost,
      adminFound: rows.length > 0,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      step: "network",
      message: "לא מצליח להתחבר ל-Supabase",
      urlHost: config.urlHost,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
