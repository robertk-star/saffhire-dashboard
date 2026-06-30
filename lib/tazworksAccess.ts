export type TazworksAccessStatus = {
  lockedMode: boolean;
  allowedClientCount: number;
  lockedClientGuidSet: boolean;
};

function splitGuids(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function getTazworksAllowedClientGuids(): string[] {
  const values = [
    ...splitGuids(process.env.TAZWORKS_ALLOWED_CLIENT_GUIDS || ""),
    ...splitGuids(process.env.TAZWORKS_LOCKED_CLIENT_GUID || ""),
  ];
  return Array.from(new Set(values));
}

export function getTazworksAccessStatus(): TazworksAccessStatus {
  const allowed = getTazworksAllowedClientGuids();
  return {
    lockedMode: process.env.TAZWORKS_CLIENT_DASHBOARD_MODE === "true" || allowed.length > 0,
    allowedClientCount: allowed.length,
    lockedClientGuidSet: Boolean(process.env.TAZWORKS_LOCKED_CLIENT_GUID),
  };
}

export function resolveTazworksClientGuid(requestedClientGuid?: string) {
  const requested = String(requestedClientGuid || "").trim();
  const status = getTazworksAccessStatus();
  const allowed = getTazworksAllowedClientGuids();
  if (!status.lockedMode) return requested;
  const selected = requested || allowed[0] || "";
  if (!selected) throw new Error("TAZWORKS_CLIENT_ACCESS_NOT_CONFIGURED");
  if (!allowed.includes(selected)) throw new Error("TAZWORKS_CLIENT_ACCESS_DENIED");
  return selected;
}

export function filterTazworksClientOptions<T extends { guid: string }>(clients: T[]): T[] {
  const status = getTazworksAccessStatus();
  if (!status.lockedMode) return clients;
  const allowed = new Set(getTazworksAllowedClientGuids());
  return clients.filter((client) => allowed.has(client.guid));
}
