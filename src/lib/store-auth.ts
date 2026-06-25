import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyPassword } from "@/lib/auth";

/** שם משתמש פנימי — לא מוצג ללקוח */
export const DEFAULT_STORE_USERNAME = "ראשי";

export interface StoreLoginRow {
  id: string;
  store_name: string;
  username: string;
  password_hash: string;
}

export async function findStoreByNameAndPassword(
  supabase: SupabaseClient,
  storeName: string,
  password: string,
): Promise<StoreLoginRow | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("id, store_name, username, password_hash")
    .eq("store_name", storeName);

  if (error) throw new Error(error.message);

  for (const store of data ?? []) {
    if (await verifyPassword(password, store.password_hash)) {
      return store as StoreLoginRow;
    }
  }

  return null;
}

export async function storeNameExists(
  supabase: SupabaseClient,
  storeName: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("stores")
    .select("id")
    .eq("store_name", storeName)
    .limit(1);

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}
