export function getSupabaseUrl() {
  const raw =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "";

  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

export function getSupabaseSecretKey() {
  return (
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    ""
  );
}

export function getSupabaseConfig() {
  const url = getSupabaseUrl();
  const key = getSupabaseSecretKey();

  return {
    url,
    key,
    urlHost: url ? new URL(url).host : null,
    keyPrefix: key ? key.slice(0, 10) : null,
    isConfigured: Boolean(url && key),
  };
}
