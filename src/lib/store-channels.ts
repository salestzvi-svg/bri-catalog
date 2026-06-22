import type { SupabaseClient } from "@supabase/supabase-js";
import type { WhatsAppChannel } from "@/lib/types";

function isMissingColumn(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42P01") return true;
  const msg = error.message?.toLowerCase() ?? "";
  return (
    msg.includes("store_link_tracking") ||
    msg.includes("signup_channel") ||
    msg.includes("last_login_channel") ||
    msg.includes("schema cache")
  );
}

export async function insertStore(
  supabase: SupabaseClient,
  row: { store_name: string; username: string; password_hash: string },
) {
  return supabase
    .from("stores")
    .insert(row)
    .select("id, store_name, username, password_hash")
    .single();
}

async function saveChannelOnStoreRow(
  supabase: SupabaseClient,
  storeId: string,
  channel: WhatsAppChannel,
  isNew: boolean,
) {
  if (isNew) {
    const { error } = await supabase
      .from("stores")
      .update({
        signup_channel: channel,
        last_login_channel: channel,
      })
      .eq("id", storeId);
    if (error && !isMissingColumn(error)) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase
    .from("stores")
    .update({ last_login_channel: channel })
    .eq("id", storeId);
  if (error && !isMissingColumn(error)) {
    throw new Error(error.message);
  }
}

export async function trackStoreLogin(
  supabase: SupabaseClient,
  storeId: string,
  channel: WhatsAppChannel,
  isNew: boolean,
) {
  const { data: existing, error: lookupError } = await supabase
    .from("store_link_tracking")
    .select("store_id, signup_channel")
    .eq("store_id", storeId)
    .maybeSingle();

  if (!lookupError) {
    if (existing) {
      await supabase
        .from("store_link_tracking")
        .update({
          last_login_channel: channel,
          updated_at: new Date().toISOString(),
        })
        .eq("store_id", storeId);
    } else {
      await supabase.from("store_link_tracking").insert({
        store_id: storeId,
        signup_channel: isNew ? channel : "default",
        last_login_channel: channel,
      });
    }
    return;
  }

  if (isMissingColumn(lookupError)) {
    await saveChannelOnStoreRow(supabase, storeId, channel, isNew);
  }
}

export async function listStores(supabase: SupabaseClient) {
  const trackingResult = await supabase
    .from("store_link_tracking")
    .select("store_id, signup_channel, last_login_channel");

  if (!trackingResult.error) {
    const trackingByStore = new Map(
      (trackingResult.data ?? []).map((row) => [row.store_id, row]),
    );

    const storesResult = await supabase
      .from("stores")
      .select("id, store_name, username, created_at")
      .order("created_at", { ascending: false });

    if (storesResult.error) {
      return { ...storesResult, trackingEnabled: true as const };
    }

    const stores = (storesResult.data ?? []).map((store) => {
      const tracking = trackingByStore.get(store.id);
      return {
        ...store,
        signup_channel: (tracking?.signup_channel ?? "default") as WhatsAppChannel,
        last_login_channel: (tracking?.last_login_channel ??
          "default") as WhatsAppChannel,
      };
    });

    return { data: stores, error: null, trackingEnabled: true as const };
  }

  const storesWithColumns = await supabase
    .from("stores")
    .select(
      "id, store_name, username, created_at, signup_channel, last_login_channel",
    )
    .order("created_at", { ascending: false });

  if (!storesWithColumns.error) {
    const stores = (storesWithColumns.data ?? []).map((store) => ({
      ...store,
      signup_channel: (store.signup_channel ?? "default") as WhatsAppChannel,
      last_login_channel: (store.last_login_channel ??
        "default") as WhatsAppChannel,
    }));
    return { data: stores, error: null, trackingEnabled: true as const };
  }

  if (isMissingColumn(storesWithColumns.error)) {
    const storesResult = await supabase
      .from("stores")
      .select("id, store_name, username, created_at")
      .order("created_at", { ascending: false });

    if (storesResult.error) {
      return { ...storesResult, trackingEnabled: false as const };
    }

    const stores = (storesResult.data ?? []).map((store) => ({
      ...store,
      signup_channel: "default" as WhatsAppChannel,
      last_login_channel: "default" as WhatsAppChannel,
    }));

    return { data: stores, error: null, trackingEnabled: false as const };
  }

  return { ...storesWithColumns, trackingEnabled: false as const };
}
