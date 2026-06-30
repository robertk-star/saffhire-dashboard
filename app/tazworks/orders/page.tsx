import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { getDefaultTazworksClientGuid, getTazworksStatus, listTazworksOrders } from "@/lib/tazworks";
import { requireUser } from "@/lib/session";

function cleanFileNumber(value?: string) { return String(value || "").trim(); }
function safeGuid(value: string) { return value ? `${value.slice(0, 8)}...${value.slice(-6)}` : "Not set"; }
function safeOrderError(raw: string) {
  const text = String(raw || "");
  if (!text) return "";
  if (text.includes("NOT_AUTHORIZED") || text.toLowerCase().includes("not authorized")) return "TazWorks returned NOT_AUTHORIZED. The app reached TazWorks, but the API credential or client access was rejected.";
  if (text.includes("NOT_AUTHENTICATED") || text.toLowerCase().includes("not authenticated")) return "TazWorks returned NOT_AUTHENTICATED. The API credential may be missing, expired, or copied incorrectly.";
  if (text.includes("404")) return "TazWorks returned not found. Check the live base URL and client GUID.";
  if (text.includes("429")) return "TazWorks returned a rate limit response. Wait and try again.";
  return `TazWorks order pull failed: ${text.slice(0, 240)}`;
}

export default async function TazworksOrdersPage({ searchParams }: { searchParams: Promise<{ clientGuid?: string; fileNumber?: string; pull?: string; error?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const params = await searchParams;
  const status = getTazworksStatus();
  const clientGuid = params.clientGuid || getDefaultTazworksClientGuid();
  const fileNumber = cleanFileNumber(params.fileNumber);
  const shouldPull = Boolean(params.pull || fileNumber);
  let orders: any[] = [];
  let error = params.error || "";
  if (clientGuid && shouldPull) {
    try {
      const data = await listTazworksOrders(clientGuid, 0, fileNumber ? 10 : 2);
      const rows = Array.isArray(data) ? data : data?.content || data?.items || data?.orders || [];
      orders = fileNumber ? rows.filter((row: any) => String(row.fileNumber || "") === fileNumber) : rows;
    } catch (err: any) {
      error = err?.message || "orders_pull_failed";
    }
  }
  const safeError = safeOrderError(error);
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>TazWorks Orders</h1><div className="card" style={{ background: status.sandboxMode ? "#f8fafc" : "#fff7ed", borderColor: status.sandboxMode ? "#cbd5e1" : "#fdba74", padding: 16, marginBottom: 18 }}><strong>{status.sandboxMode ? "Sandbox Mode" : "Live TazWorks Mode"}</strong><p style={{ marginBottom: 0 }}>This page is read-only. It only pulls order information from TazWorks. It does not create, edit, submit, cancel, or update TazWorks orders.</p></div><p style={{ color: "#5d687b" }}>For live use, search by file number when possible. Pull Recent only loads 2 read-only rows, matching your Postman test size.</p><section className="card" style={{ padding: 18, marginBottom: 18 }}><form method="get" action="/tazworks/orders" style={{ display: "grid", gap: 12 }}><input type="hidden" name="pull" value="1" /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, alignItems: "end" }}><label><span className="field-label">Client GUID</span><input className="field-input" name="clientGuid" defaultValue={clientGuid} placeholder="TazWorks client GUID" /></label><label><span className="field-label">File Number</span><input className="field-input" name="fileNumber" defaultValue={fileNumber} placeholder="Optional, safer for live" /></label><button className="btn-primary" type="submit">Search / Pull Orders</button><Link className="btn-secondary" href="/tazworks/clients">Choose Client</Link></div></form><p style={{ color: "#5d687b", marginBottom: 0 }}>Current client GUID: {safeGuid(clientGuid)}</p></section>{safeError ? <div className="card" style={{ borderColor: "#fda29b", background: "#fff5f5", color: "#b42318", fontWeight: 700, marginBottom: 18, padding: 16 }}><p style={{ marginTop: 0 }}>{safeError}</p><p style={{ marginBottom: 0 }}>Compare this app call with Postman: GET /v1/clients/[client-guid]/orders?page=0&amp;size=2. Make sure Vercel has the same live base URL, same client GUID, and the API credential value only.</p></div> : null}<section className="card table-wrap"><table><thead><tr><th>File #</th><th>Applicant</th><th>Status</th><th>Client</th><th>Product</th><th>Ordered</th><th>Action</th></tr></thead><tbody>{orders.length ? orders.map((row: any) => <tr key={row.orderGuid}><td>{row.fileNumber || ""}</td><td>{row.applicantName || ""}</td><td>{row.orderStatus || ""}</td><td>{row.clientName || row.clientCode || ""}</td><td>{row.productName || ""}</td><td>{row.orderedDate ? new Date(row.orderedDate).toLocaleString() : ""}</td><td><Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/tazworks/orders/${row.orderGuid}?clientGuid=${encodeURIComponent(clientGuid)}&fileNumber=${encodeURIComponent(String(row.fileNumber || ""))}`}>View Searches</Link></td></tr>) : <tr><td colSpan={7}>{clientGuid && shouldPull ? "No matching orders returned." : "Enter a file number or click Search / Pull Orders."}</td></tr>}</tbody></table></section></main></>;
}
