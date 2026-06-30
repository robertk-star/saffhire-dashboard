import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { getDefaultTazworksClientGuid, getTazworksStatus, listTazworksClients, listTazworksOrders, normalizeTazworksClientList } from "@/lib/tazworks";
import { requireUser } from "@/lib/session";
import { listTazworksSavedClients } from "@/lib/tazworksSavedClients";

function cleanFileNumber(value?: string) { return String(value || "").trim(); }
function safeGuid(value: string) { return value ? `${value.slice(0, 8)}...${value.slice(-6)}` : "Not set"; }
function safeOrderError(raw: string) {
  const text = String(raw || "");
  if (!text) return "";
  if (text.includes("NOT_AUTHORIZED") || text.toLowerCase().includes("not authorized")) return "TazWorks returned NOT_AUTHORIZED. The app reached TazWorks, but the API credential or client access was rejected.";
  if (text.includes("NOT_AUTHENTICATED") || text.toLowerCase().includes("not authenticated")) return "TazWorks returned NOT_AUTHENTICATED. The API credential may be missing, expired, or copied incorrectly.";
  if (text.includes("401")) return "The fixed-IP proxy rejected the request. Check TAZWORKS_PROXY_SECRET in Vercel.";
  if (text.includes("404")) return "TazWorks returned not found. Check the live base URL and selected client GUID.";
  if (text.includes("429")) return "TazWorks returned a rate limit response. Wait and try again.";
  return `TazWorks order pull failed: ${text.slice(0, 240)}`;
}

export default async function TazworksOrdersPage({ searchParams }: { searchParams: Promise<{ clientGuid?: string; clientName?: string; clientCode?: string; fileNumber?: string; pull?: string; error?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const params = await searchParams;
  const status = getTazworksStatus();
  const defaultClientGuid = getDefaultTazworksClientGuid();
  const selectedClientGuid = params.clientGuid || defaultClientGuid;
  const fileNumber = cleanFileNumber(params.fileNumber);
  const shouldPull = Boolean(params.pull || fileNumber);
  let liveClients = [] as ReturnType<typeof normalizeTazworksClientList>;
  let savedClients: any[] = [];
  let clientsError = "";
  try {
    const clientData = await listTazworksClients(0, 100);
    liveClients = normalizeTazworksClientList(clientData);
  } catch (err: any) {
    clientsError = err?.message || "clients_pull_failed";
  }
  try { savedClients = await listTazworksSavedClients(false); } catch {}
  const savedOptions = savedClients.map((client) => ({ guid: client.client_guid, name: client.name, code: client.client_code || "", label: client.client_code ? `${client.name} (${client.client_code})` : client.name }));
  const clientMap = new Map<string, { guid: string; name: string; code: string; label: string }>();
  for (const client of liveClients) clientMap.set(client.guid, { guid: client.guid, name: client.name, code: client.code, label: client.label });
  for (const client of savedOptions) clientMap.set(client.guid, client);
  const clients = Array.from(clientMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  const selectedClient = clients.find((client) => client.guid === selectedClientGuid);
  const clientName = selectedClient?.name || params.clientName || "";
  const clientCode = selectedClient?.code || params.clientCode || "";
  const selectedClientLabel = selectedClient?.label || (clientName ? clientCode ? `${clientName} (${clientCode})` : clientName : selectedClientGuid ? safeGuid(selectedClientGuid) : "No client selected");
  let orders: any[] = [];
  let error = params.error || "";
  if (selectedClientGuid && shouldPull) {
    try {
      const data = await listTazworksOrders(selectedClientGuid, 0, fileNumber ? 10 : 2);
      const rows = Array.isArray(data) ? data : data?.content || data?.items || data?.orders || [];
      orders = fileNumber ? rows.filter((row: any) => String(row.fileNumber || "") === fileNumber) : rows;
    } catch (err: any) {
      error = err?.message || "orders_pull_failed";
    }
  }
  const safeError = safeOrderError(error);
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>TazWorks Orders</h1><div className="card" style={{ background: status.sandboxMode ? "#f8fafc" : "#fff7ed", borderColor: status.sandboxMode ? "#cbd5e1" : "#fdba74", padding: 16, marginBottom: 18 }}><strong>{status.sandboxMode ? "Sandbox Mode" : "Live TazWorks Mode"}</strong><p style={{ marginBottom: 0 }}>This page is read-only. It only pulls order information from TazWorks. It does not create, edit, submit, cancel, or update TazWorks orders.</p></div><p style={{ color: "#5d687b" }}>Select a saved or live client first. For live use, search by file number when possible.</p><section className="card" style={{ padding: 18, marginBottom: 18 }}><form method="get" action="/tazworks/orders" style={{ display: "grid", gap: 12 }}><input type="hidden" name="pull" value="1" /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, alignItems: "end" }}>{clients.length ? <label><span className="field-label">TazWorks Client</span><select className="field-input" name="clientGuid" defaultValue={selectedClientGuid}><option value="">Select client...</option>{clients.map((client) => <option key={client.guid} value={client.guid}>{client.label}</option>)}</select></label> : <label><span className="field-label">Client GUID</span><input className="field-input" name="clientGuid" defaultValue={selectedClientGuid} placeholder="TazWorks client GUID" /></label>}<label><span className="field-label">File Number</span><input className="field-input" name="fileNumber" defaultValue={fileNumber} placeholder="Optional, safer for live" /></label><button className="btn-primary" type="submit">Search / Pull Orders</button><Link className="btn-secondary" href="/tazworks/clients">Manage Clients</Link></div></form><p style={{ color: "#5d687b", marginBottom: 0 }}>Selected client: {selectedClientLabel} | GUID: {safeGuid(selectedClientGuid)}</p>{clientsError ? <p style={{ color: "#b42318", fontWeight: 700, marginBottom: 0 }}>Live clients did not load. Saved clients and manual GUID entry still work.</p> : null}</section>{safeError ? <div className="card" style={{ borderColor: "#fda29b", background: "#fff5f5", color: "#b42318", fontWeight: 700, marginBottom: 18, padding: 16 }}><p style={{ marginTop: 0 }}>{safeError}</p><p style={{ marginBottom: 0 }}>Compare this app call with Postman through the proxy. Make sure Vercel has the same proxy URL, proxy secret, and the selected client has TazWorks access.</p></div> : null}<section className="card table-wrap"><table><thead><tr><th>File #</th><th>Applicant</th><th>Status</th><th>Client</th><th>Product</th><th>Ordered</th><th>Action</th></tr></thead><tbody>{orders.length ? orders.map((row: any) => { const rowClientName = row.clientName || clientName; const rowClientCode = row.clientCode || clientCode; return <tr key={row.orderGuid}><td>{row.fileNumber || ""}</td><td>{row.applicantName || ""}</td><td>{row.orderStatus || ""}</td><td>{rowClientName || rowClientCode || ""}</td><td>{row.productName || ""}</td><td>{row.orderedDate ? new Date(row.orderedDate).toLocaleString() : ""}</td><td><Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/tazworks/orders/${row.orderGuid}?clientGuid=${encodeURIComponent(selectedClientGuid)}&clientName=${encodeURIComponent(rowClientName || "")}&clientCode=${encodeURIComponent(rowClientCode || "")}&fileNumber=${encodeURIComponent(String(row.fileNumber || ""))}`}>View Searches</Link></td></tr>; }) : <tr><td colSpan={7}>{selectedClientGuid && shouldPull ? "No matching orders returned." : "Select a client, then enter a file number or click Search / Pull Orders."}</td></tr>}</tbody></table></section></main></>;
}
