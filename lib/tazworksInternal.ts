type TazworksClientOption = { guid: string; name: string; code: string; label: string; raw: any };

function cleanBaseUrl() {
  return (process.env.TAZWORKS_API_BASE_URL || "https://api-sandbox.instascreen.net").replace(/\/$/, "");
}

function cleanProxyBaseUrl() {
  return (process.env.TAZWORKS_PROXY_BASE_URL || "").replace(/\/$/, "");
}

function useProxy() {
  return process.env.TAZWORKS_USE_PROXY === "true" || Boolean(cleanProxyBaseUrl());
}

function getBearerCredential() {
  const raw = process.env.TAZWORKS_BEARER_TOKEN || process.env.TAZWORKS_JWT_TOKEN || "";
  return raw.trim().replace(/^Bearer\s+/i, "").trim();
}

function getProxySecret() {
  return String(process.env.TAZWORKS_PROXY_SECRET || "").trim().replace(/^Bearer\s+/i, "").trim();
}

function parseJsonOrText(text: string) {
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

async function internalTazworksRequest(proxyPath: string, directPath: string) {
  if (useProxy()) {
    const proxyBaseUrl = cleanProxyBaseUrl();
    const proxySecret = getProxySecret();
    if (!proxyBaseUrl) throw new Error("TazWorks proxy base URL is not configured.");
    if (!proxySecret) throw new Error("TazWorks proxy secret is not configured.");
    const path = proxyPath.startsWith("/") ? proxyPath : `/${proxyPath}`;
    const response = await fetch(`${proxyBaseUrl}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${proxySecret}`, Accept: "application/json" },
      cache: "no-store",
    });
    const text = await response.text();
    const data: any = parseJsonOrText(text);
    if (!response.ok) throw new Error(typeof data === "object" ? JSON.stringify(data) : String(data));
    return data;
  }

  const token = getBearerCredential();
  if (!token) throw new Error("TazWorks bearer credential is not configured.");
  const path = directPath.startsWith("/") ? directPath : `/${directPath}`;
  const response = await fetch(`${cleanBaseUrl()}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  const text = await response.text();
  const data: any = parseJsonOrText(text);
  if (!response.ok) throw new Error(typeof data === "object" ? JSON.stringify(data) : String(data));
  return data;
}

function requireGuid(value: string, label: string) {
  const guid = String(value || "").trim();
  if (!guid) throw new Error(`${label} is required.`);
  return guid;
}

export function normalizeTazworksClientListInternal(data: any): TazworksClientOption[] {
  const rows = Array.isArray(data) ? data : data?.content || data?.items || data?.clients || [];
  return rows.map((row: any) => {
    const guid = String(row?.clientGuid || row?.guid || row?.id || row?.clientIdentifier || row?.clientId || "");
    const name = String(row?.name || row?.clientName || row?.displayName || row?.companyName || "Unnamed client");
    const code = String(row?.code || row?.clientCode || row?.accountCode || "");
    return { guid, name, code, label: code ? `${name} (${code})` : name, raw: row };
  }).filter((client: TazworksClientOption) => Boolean(client.guid));
}

export async function listTazworksClientsInternal(page = 0, size = 100) {
  return internalTazworksRequest(
    `/tazworks/clients?page=${page}&size=${size}`,
    `/v1/clients?page=${page}&size=${size}`,
  );
}

export async function listTazworksOrdersInternal(clientGuid: string, page = 0, size = 100) {
  const guid = requireGuid(clientGuid, "TazWorks client GUID");
  return internalTazworksRequest(
    `/tazworks/orders?page=${page}&size=${size}&clientGuid=${encodeURIComponent(guid)}`,
    `/v1/clients/${encodeURIComponent(guid)}/orders?page=${page}&size=${size}`,
  );
}

export async function listTazworksOrderSearchesInternal(clientGuid: string, orderGuid: string) {
  const client = requireGuid(clientGuid, "TazWorks client GUID");
  const order = requireGuid(orderGuid, "TazWorks order GUID");
  return internalTazworksRequest(
    `/tazworks/orders/${encodeURIComponent(order)}/searches?clientGuid=${encodeURIComponent(client)}`,
    `/v1/clients/${encodeURIComponent(client)}/orders/${encodeURIComponent(order)}/searches`,
  );
}

export async function getTazworksOrderInternal(clientGuid: string, orderGuid: string) {
  const client = requireGuid(clientGuid, "TazWorks client GUID");
  const order = requireGuid(orderGuid, "TazWorks order GUID");
  return internalTazworksRequest(
    `/tazworks/orders/${encodeURIComponent(order)}?clientGuid=${encodeURIComponent(client)}`,
    `/v1/clients/${encodeURIComponent(client)}/orders/${encodeURIComponent(order)}`,
  );
}

export async function getTazworksApplicantFromOrderInternal(clientGuid: string, orderGuid: string) {
  const client = requireGuid(clientGuid, "TazWorks client GUID");
  const order = requireGuid(orderGuid, "TazWorks order GUID");
  return internalTazworksRequest(
    `/tazworks/orders/${encodeURIComponent(order)}/applicant/pullFromOrder?clientGuid=${encodeURIComponent(client)}`,
    `/v1/clients/${encodeURIComponent(client)}/order/${encodeURIComponent(order)}/applicant/pullFromOrder`,
  );
}

export async function getTazworksSearchResultInternal(clientGuid: string, orderGuid: string, searchGuid: string, resultType = "") {
  const client = requireGuid(clientGuid, "TazWorks client GUID");
  const order = requireGuid(orderGuid, "TazWorks order GUID");
  const search = requireGuid(searchGuid, "TazWorks search GUID");
  const params = new URLSearchParams();
  params.set("clientGuid", client);
  if (resultType) params.set("resultType", resultType);
  const directSuffix = resultType ? `?resultType=${encodeURIComponent(resultType)}` : "";
  return internalTazworksRequest(
    `/tazworks/orders/${encodeURIComponent(order)}/searches/${encodeURIComponent(search)}/results?${params.toString()}`,
    `/v1/clients/${encodeURIComponent(client)}/orders/${encodeURIComponent(order)}/searches/${encodeURIComponent(search)}/results${directSuffix}`,
  );
}

export async function getAllTazworksSearchResultsInternal(clientGuid: string, orderGuid: string) {
  const client = requireGuid(clientGuid, "TazWorks client GUID");
  const order = requireGuid(orderGuid, "TazWorks order GUID");
  return internalTazworksRequest(
    `/tazworks/orders/${encodeURIComponent(order)}/searches/results?clientGuid=${encodeURIComponent(client)}`,
    `/v1/clients/${encodeURIComponent(client)}/orders/${encodeURIComponent(order)}/searches/results`,
  );
}
