import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;

export async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
  select = "*",
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as T[];
    all.push(...rows);

    if (rows.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return all;
}
