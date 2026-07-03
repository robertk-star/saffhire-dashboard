import { getTazworksApplicantFromOrder, getTazworksOrder, listTazworksOrderSearches } from "@/lib/tazworks";

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

function cleanName(value: string) {
  return value.replace(/\s+/g, " ").trim();
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

function fullName(row: any) {
  return cleanName([row?.firstName, row?.middleName, row?.lastName, row?.generation].filter(Boolean).join(" "));
}

function firstLast(row: any) {
  return cleanName([row?.firstName, row?.lastName].filter(Boolean).join(" "));
}

function firstLastGeneration(row: any, generationOverride?: string) {
  return cleanName([row?.firstName, row?.lastName, generationOverride || row?.generation].filter(Boolean).join(" "));
}

function lastFirstGeneration(row: any) {
  return cleanName([row?.lastName, row?.firstName, row?.generation].filter(Boolean).join(" "));
}

function aliasNames(applicant: any) {
  const aliases = Array.isArray(applicant?.aliases) ? applicant.aliases : [];
  const values = [
    firstLast(applicant),
    fullName(applicant),
    firstLastGeneration(applicant),
    lastFirstGeneration(applicant),
    ...aliases.flatMap((alias: any) => [firstLast(alias), fullName(alias), firstLastGeneration(alias), lastFirstGeneration(alias)]),
  ];
  const generation = String(applicant?.generation || "").trim().toUpperCase();
  if (generation === "JR" || generation === "JR.") {
    values.push(firstLastGeneration(applicant, "II"));
  }
  return unique(values, 40);
}

function collectValues(source: any, match: (key: string) => boolean, output: string[] = []) {
  if (!source || typeof source !== "object") return output;
  if (Array.isArray(source)) {
    for (const item of source) collectValues(item, match, output);
    return output;
  }
  for (const [key, value] of Object.entries(source)) {
    const normalized = cleanKey(key);
    const blocked = ["clientguid", "orderguid", "searchguid", "ordersearchguid", "analysisreference", "basereference", "id", "guid", "ssn", "aliasguid"].includes(normalized);
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
  let applicantRow: any = null;
  try {
    orderRow = await getTazworksOrder(clientGuid, orderGuid);
  } catch {}
  try {
    applicantRow = await getTazworksApplicantFromOrder(clientGuid, orderGuid);
    if (orderRow && typeof orderRow === "object") orderRow = { ...orderRow, _saffhireApplicantFromOrder: applicantRow };
  } catch {}
  try {
    const searchesData = await listTazworksOrderSearches(clientGuid, orderGuid);
    const searches = Array.isArray(searchesData) ? searchesData : searchesData?.content || searchesData?.items || searchesData?.searches || [];
    searchRow = searches.find((row: any) => String(row?.orderSearchGuid || row?.searchGuid || row?.id || row?.guid || "") === searchGuid) || null;
  } catch {}
  return { orderRow, searchRow, applicantRow };
}

export function buildTazworksIdentityText(input: { payload: any; orderRow: any; searchRow: any; fallbackName: string; fallbackDob: string; applicantRow?: any }) {
  const order = input.orderRow || {};
  const search = input.searchRow || {};
  const applicant = input.applicantRow || order._saffhireApplicantFromOrder || {};
  const sources = [order, applicant, search, input.payload].filter(Boolean);
  const applicantName = fullName(applicant);
  const names = unique([
    order.applicantName || "",
    applicantName,
    input.fallbackName,
    ...sources.flatMap((source) => collectValues(source, (key) => ["applicantname", "subjectname", "candidatename", "personname", "fullname", "namesearched", "nameonrecord"].includes(key))),
  ]);
  const aliases = unique([
    ...aliasNames(applicant),
    ...sources.flatMap((source) => collectValues(source, (key) => key.includes("aka") || key.includes("namevariation") || key.includes("namevariations") || key.includes("othername") || key.includes("previousname"))),
  ], 40);
  const dobs = unique([
    order.applicantDateOfBirth || "",
    applicant.dateOfBirth || "",
    input.fallbackDob,
    ...sources.flatMap((source) => collectValues(source, (key) => ["dob", "dateofbirth", "birthdate", "dobsearched", "dobonrecord", "birthdt", "applicantdateofbirth"].includes(key) || key.includes("dateofbirth"))),
  ]);
  const addresses = unique([
    ...collectAddresses(applicant.addresses || []),
    ...sources.flatMap((source) => collectAddresses(source)),
  ], 30);
  const includedSearches = Array.isArray(order.includedSearches) ? order.includedSearches.join("; ") : text(order.includedSearches);
  return [
    "Identity Pulled From TazWorks",
    `File Number: ${order.fileNumber || "Not found"}`,
    `Client / Company: ${order.clientName || "Not found"}`,
    `Client Code: ${order.clientCode || "Not found"}`,
    `Order Status: ${order.orderStatus || "Not found"}`,
    `Applicant GUID: ${applicant.applicantGuid || "Not found"}`,
    `Applicant Email: ${applicant.email || order.applicantEmail || "Not found"}`,
    `Product Name: ${order.productName || "Not found"}`,
    `Product GUID: ${order.clientProductGuid || "Not found"}`,
    `Included Searches: ${includedSearches || "Not found"}`,
    `Search Type: ${search.displayName || search.type || input.payload?.displayName || input.payload?.type || "Not found"}`,
    `Search Status: ${search.status || "Not found"}`,
    `Search Value: ${search.displayValue || input.payload?.displayValue || "Not found"}`,
    `Name Searched: ${names.join("; ") || "Not found"}`,
    `Alias Names: ${aliases.join("; ") || "Not found"}`,
    `DOB: ${dobs.join("; ") || "Not found"}`,
    `Address History: ${addresses.join("; ") || "Not found"}`,
    "",
  ].join("\n");
}
