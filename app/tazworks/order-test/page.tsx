import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";
import { getDefaultTazworksClientGuid, getTazworksSearchResult, getTazworksStatus, listTazworksOrderSearches, listTazworksOrders } from "@/lib/tazworks";

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

function isGuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

function unique(values: string[], limit = 50) {
  const seen = new Set<string>();
  return values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean).filter((value) => !/^not found$/i.test(value)).filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

function collect(source: any, match: (key: string) => boolean, output: string[] = []) {
  if (!source || typeof source !== "object") return output;
  if (Array.isArray(source)) {
    for (const item of source) collect(item, match, output);
    return output;
  }
  for (const [key, value] of Object.entries(source)) {
    const normalized = cleanKey(key);
    if (match(normalized)) output.push(text(value));
    if (value && typeof value === "object") collect(value, match, output);
  }
  return output;
}

function collectAddressObjects(source: any, output: string[] = []) {
  if (!source || typeof source !== "object") return output;
  if (Array.isArray(source)) {
    for (const item of source) collectAddressObjects(item, output);
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
    if ((normalized.includes("address") || normalized.includes("residence")) && typeof value === "string") output.push(value);
    if (value && typeof value === "object") collectAddressObjects(value, output);
  }
  return output;
}

function FieldList({ label, values }: { label: string; values: string[] }) {
  return <div className="card" style={{ padding: 16 }}><strong>{label}</strong>{values.length ? <ul style={{ lineHeight: 1.7, marginBottom: 0, marginTop: 8 }}>{values.map((value, index) => <li key={index}>{value}</li>)}</ul> : <p style={{ color: "#5d687b", marginBottom: 0 }}>Not found in pulled data.</p>}</div>;
}

function RawBlock({ title, value }: { title: string; value: any }) {
  return <section className="card" style={{ padding: 18, marginTop: 18 }}><h2 style={{ marginTop: 0 }}>{title}</h2><pre style={{ background: "#f8fafc", borderRadius: 12, maxHeight: 520, overflow: "auto", padding: 16, whiteSpace: "pre-wrap" }}>{JSON.stringify(value || null, null, 2)}</pre></section>;
}

function getRows(data: any, key: string) {
  return Array.isArray(data) ? data : data?.content || data?.items || data?.[key] || [];
}

export default async function TazworksOrderTestPage({ searchParams }: { searchParams: Promise<{ clientGuid?: string; orderGuid?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const params = await searchParams;
  const status = getTazworksStatus();
  let defaultClientGuid = "";
  try { defaultClientGuid = getDefaultTazworksClientGuid(); } catch {}
  const clientGuid = String(params.clientGuid || defaultClientGuid || "");
  const orderGuid = String(params.orderGuid || "");
  let orderData: any = null;
  let orderRow: any = null;
  let searchesData: any = null;
  let searches: any[] = [];
  const resultRows: any[] = [];
  let error = "";

  if (clientGuid && orderGuid) {
    try {
      orderData = await listTazworksOrders(clientGuid, 0, 100);
      const orders = getRows(orderData, "orders");
      orderRow = orders.find((row: any) => String(row?.orderGuid || row?.id || row?.guid || "") === orderGuid) || null;
      searchesData = await listTazworksOrderSearches(clientGuid, orderGuid);
      searches = getRows(searchesData, "searches");
      for (const search of searches) {
        const searchGuid = String(search?.orderSearchGuid || search?.searchGuid || search?.id || search?.guid || "");
        if (!searchGuid) continue;
        try {
          const result = await getTazworksSearchResult(clientGuid, orderGuid, searchGuid);
          resultRows.push({ searchGuid, search, result });
        } catch (err: any) {
          resultRows.push({ searchGuid, search, error: err?.message || "result_pull_failed" });
        }
      }
    } catch (err: any) {
      error = err?.message || "order_test_failed";
    }
  }

  const sources = [orderRow, searches, resultRows.map((row) => row.result)].filter(Boolean);
  const orderGuidValues = unique([orderGuid, ...sources.flatMap((source) => collect(source, (key) => key === "orderguid" || key === "orderid"))].filter(Boolean));
  const applicantNames = unique(sources.flatMap((source) => collect(source, (key) => ["applicantname", "subjectname", "candidatename", "personname", "fullname", "displayvalue"].includes(key))));
  const applicantGuids = unique(sources.flatMap((source) => collect(source, (key) => key.includes("applicantguid") || key.includes("candidateguid") || key.includes("personguid") || key.includes("subjectguid") || key.includes("applicantid") || key.includes("candidateid") || key.includes("personid"))).filter(isGuidLike));
  const dobs = unique(sources.flatMap((source) => collect(source, (key) => ["dob", "dateofbirth", "birthdate", "dobsearched", "dobonrecord", "birthdt"].includes(key) || key.includes("dateofbirth"))));
  const addresses = unique(sources.flatMap((source) => collectAddressObjects(source)), 50);
  const addressGuids = unique(sources.flatMap((source) => collect(source, (key) => key.includes("addressguid") || key.includes("addressid"))).filter((value) => isGuidLike(value) || value.length > 4));
  const productNames = unique(sources.flatMap((source) => collect(source, (key) => key.includes("productname") || key === "product" || key.includes("packagename") || key.includes("searchtype") || key.includes("displayname"))));
  const productGuids = unique(sources.flatMap((source) => collect(source, (key) => key.includes("productguid") || key.includes("productid") || key.includes("packageguid") || key.includes("packageid"))).filter((value) => isGuidLike(value) || value.length > 4));

  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>TazWorks Order Test</h1><div className="card" style={{ background: status.sandboxMode ? "#f8fafc" : "#fff7ed", borderColor: status.sandboxMode ? "#cbd5e1" : "#fdba74", padding: 16, marginBottom: 18 }}><strong>{status.sandboxMode ? "Sandbox Mode" : "Live TazWorks Mode"}</strong><p style={{ marginBottom: 0 }}>This is a read-only diagnostic page. It pulls one order and shows what identity/product fields are available.</p></div><section className="card" style={{ padding: 18, marginBottom: 18 }}><form method="get" action="/tazworks/order-test" style={{ display: "grid", gap: 12 }}><label><span className="field-label">Client GUID</span><input className="field-input" name="clientGuid" defaultValue={clientGuid} placeholder="Client GUID" /></label><label><span className="field-label">Order GUID</span><input className="field-input" name="orderGuid" defaultValue={orderGuid} placeholder="Order GUID" /></label><button className="btn-primary" type="submit">Pull Order Test</button></form></section>{error ? <div className="card" style={{ borderColor: "#fda29b", background: "#fff5f5", color: "#b42318", fontWeight: 700, marginBottom: 18, padding: 16 }}>{error}</div> : null}{clientGuid && orderGuid ? <><section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}><FieldList label="Order GUID" values={orderGuidValues} /><FieldList label="Applicant Name" values={applicantNames} /><FieldList label="Applicant GUID" values={applicantGuids} /><FieldList label="DOB" values={dobs} /><FieldList label="Address Information" values={addresses} /><FieldList label="Address GUID" values={addressGuids} /><FieldList label="Products" values={productNames} /><FieldList label="Product GUID" values={productGuids} /></section><RawBlock title="Matched Order Row" value={orderRow} /><RawBlock title="Raw Order List Response" value={orderData} /><RawBlock title="Raw Searches Response" value={searchesData} /><RawBlock title="Raw Search Results" value={resultRows} /></> : null}</main></>;
}
