import { listTazworksOrders, listTazworksOrderSearches } from "@/lib/tazworks";

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join("; ");
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([key, val]) => `${key}: ${text(val)}`).join("; ");
  return String(value);
}

function cleanKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function unique(values: string[], limit = 30) {
  const seen = new Set<string>();
  return values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean).filter((value) => !/^not found$/i.test(value)).filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

function collectValues(source: any, match: (key: string) => boolean, output: string[] = []) {
  if (!source || typeof source !== "object") return output;
  if (Array.isArray(source)) {
    for (const item of source) collectValues(item, match, output);
    return output;
  }
  for (const [key, value] of Object.entries(source)) {
    const normalized = cleanKey(key);
    const blocked = ["clientguid", "orderguid", "searchguid", "ordersearchguid", "analysisreference", "basereference", "id", "guid"].includes(normalized);
    if (!blocked && match(normalized)) output.push(text(value));
    if (value && typeof value === "object") collectValues(value, match, output);
  }
  return output;
}

function collectAddresses(source: any, output: string[] = []) {
  if (!source || typeof source !== "object") return output;
  if (Array.isArray(source)) {
    for (const item of source) collectAddresses(item, output);
    return output;
  }
  const row = source as Record<string, unknown>;
  const parts = [
    row.addressLine1, row.address1, row.street, row.street1, row.line1,
    row.addressLine2, row.address2, row.street2, row.line2,
    row.city, row.county, row.state, row.zip, row.zipCode, row.postalCode,
  ].map(text).filter(Boolean);
  if (parts.length >= 2) output.push(parts.join(", "));
  for (const [key, value] of Object.entries(row)) {
    const normalized = cleanKey(key);
    if ((normalized.includes("address") || normalized.includes("residence")) && !normalized.includes("guid") && !normalized.endsWith("id") && typeof value === "string") output.push(value);
    if (value && typeof value === "object") collectAddresses(value, output);
  }
  return output;
}

export async function getTazworksIdentityContext(clientGuid: string, orderGuid: string, searchGuid: string) {
  let orderRow: any = null;
  let searchRow: any = null;
  try {
    const ordersData = await listTazworksOrders(clientGuid, 0, 100);
    const orders = Array.isArray(ordersData) ? ordersData : ordersData?.content || ordersData?.items || ordersData?.orders || [];
    orderRow = orders.find((row: any) => String(row?.orderGuid || row?.id || row?.guid || "") === orderGuid) || null;
  } catch {}
  try {
    const searchesData = await listTazworksOrderSearches(clientGuid, orderGuid);
    const searches = Array.isArray(searchesData) ? searchesData : searchesData?.content || searchesData?.items || searchesData?.searches || [];
    searchRow = searches.find((row: any) => String(row?.orderSearchGuid || row?.searchGuid || row?.id || row?.guid || "") === searchGuid) || null;
  } catch {}
  return { orderRow, searchRow };
}

export function buildTazworksIdentityText(input: { payload: any; orderRow: any; searchRow: any; fallbackName: string; fallbackDob: string }) {
  const sources = [input.orderRow, input.searchRow, input.payload].filter(Boolean);
  const names = unique([
    input.fallbackName,
    ...sources.flatMap((source) => collectValues(source, (key) => ["applicantname", "subjectname", "candidatename", "personname", "fullname", "namesearched", "nameonrecord"].includes(key))),
  ]);
  const aliases = unique(sources.flatMap((source) => collectValues(source, (key) => key.includes("alias") || key.includes("aka") || key.includes("namevariation") || key.includes("namevariations") || key.includes("othername") || key.includes("previousname"))));
  const dobs = unique([
    input.fallbackDob,
    ...sources.flatMap((source) => collectValues(source, (key) => ["dob", "dateofbirth", "birthdate", "dobsearched", "dobonrecord", "birthdt"].includes(key) || key.includes("dateofbirth"))),
  ]);
  const addresses = unique(sources.flatMap((source) => collectAddresses(source)), 30);
  return [
    "Identity Pulled From TazWorks",
    `Name Searched: ${names.join("; ") || "Not found"}`,
    `Alias Names: ${aliases.join("; ") || "Not found"}`,
    `DOB: ${dobs.join("; ") || "Not found"}`,
    `Address History: ${addresses.join("; ") || "Not found"}`,
    "",
  ].join("\n");
}
