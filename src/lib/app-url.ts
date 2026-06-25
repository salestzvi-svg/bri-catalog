import os from "os";

export function getLocalNetworkIp(): string | null {
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }

  return null;
}

export function getPortFromHost(host: string | null): string {
  if (!host) return process.env.PORT ?? "3000";
  const colonIndex = host.lastIndexOf(":");
  if (colonIndex === -1) return "3000";
  return host.slice(colonIndex + 1) || "3000";
}

export function buildCustomerLoginUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/login`;
}

function isLocalHost(host: string | null) {
  if (!host) return true;
  const name = host.split(":")[0]?.toLowerCase() ?? "";
  return (
    name === "localhost" ||
    name === "127.0.0.1" ||
    name.startsWith("192.168.") ||
    name.startsWith("10.") ||
    name.startsWith("169.254.") ||
    name.startsWith("172.")
  );
}

export function getCustomerLinks(host: string | null) {
  const port = getPortFromHost(host);
  const localIp = getLocalNetworkIp();
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const hostBase =
    host && !isLocalHost(host) ? `https://${host.split(":")[0]}` : null;
  const publicBase = envBase ?? hostBase;

  return {
    publicLink: publicBase ? buildCustomerLoginUrl(publicBase) : null,
    localLink: localIp
      ? buildCustomerLoginUrl(`http://${localIp}:${port}`)
      : null,
    isDeployed: Boolean(publicBase && !isLocalHost(host)),
  };
}
