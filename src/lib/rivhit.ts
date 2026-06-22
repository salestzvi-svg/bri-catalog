import type { RivhitItem } from "./types";

const RIVHIT_BASE =
  process.env.RIVHIT_API_URL ??
  "https://api.rivhit.co.il/online/RivhitOnlineAPI.svc";

const RIVHIT_CACHE_TTL_MS = 15 * 60 * 1000;
let rivhitItemsCache: { items: RivhitItem[]; fetchedAt: number } | null = null;

interface RivhitResponse<T> {
  error_code: number;
  client_message: string;
  debug_message: string;
  data: T;
}

async function rivhitRequest<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const apiToken = process.env.RIVHIT_API_TOKEN;
  if (!apiToken) {
    throw new Error("Missing RIVHIT_API_TOKEN");
  }

  const response = await fetch(`${RIVHIT_BASE}/${method}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ api_token: apiToken, ...body }),
    cache: "no-store",
  });

  const json = (await response.json()) as RivhitResponse<T>;

  if (!response.ok || json.error_code !== 0) {
    throw new Error(
      json.client_message ||
        json.debug_message ||
        `Rivhit HTTP error: ${response.status}`,
    );
  }

  return json.data;
}

export async function fetchRivhitItems(): Promise<RivhitItem[]> {
  if (
    rivhitItemsCache &&
    Date.now() - rivhitItemsCache.fetchedAt < RIVHIT_CACHE_TTL_MS
  ) {
    return rivhitItemsCache.items;
  }

  const data = await rivhitRequest<{ item_list: RivhitItem[] }>("Item.List", {});
  const items = data.item_list ?? [];
  rivhitItemsCache = { items, fetchedAt: Date.now() };
  return items;
}

export function clearRivhitItemsCache() {
  rivhitItemsCache = null;
}

export function resolveImageUrl(pictureLink: string | null): string | null {
  if (!pictureLink) return null;
  if (pictureLink.startsWith("http")) return pictureLink;

  const cleaned = pictureLink.replace(/\\/g, "/").replace(/^\/+/, "");
  return `https://api.rivhit.co.il/${cleaned}`;
}

export function withImageCacheBuster(
  url: string | null,
  version?: string | number | null,
): string | null {
  if (!url) return null;
  if (version == null || version === "") return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(String(version))}`;
}

export function resolveProductImage(
  pictureLink: string | null,
  override?: {
    custom_image?: string | null;
    updated_at?: string | null;
  } | null,
): string | null {
  if (override?.custom_image) return override.custom_image;

  const rivhitUrl = resolveImageUrl(pictureLink);
  if (!rivhitUrl) return null;

  const version = override?.updated_at
    ? new Date(override.updated_at).getTime()
    : null;

  return withImageCacheBuster(rivhitUrl, version);
}

export function getSku(item: RivhitItem): string {
  return item.item_part_num?.trim() || String(item.item_id);
}
