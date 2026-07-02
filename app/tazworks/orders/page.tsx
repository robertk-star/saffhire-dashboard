import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { getDefaultTazworksClientGuid, getTazworksStatus, listTazworksClients, listTazworksOrders, normalizeTazworksClientList } from "@/lib/tazworks";
import { filterTazworksClientOptions } from "@/lib/tazworksAccess";
import { requireUser } from "@/lib/session";
import { listTazworksSavedClients } from "@/lib/tazworksSavedClients";

function cleanFileNumber(value?: string) { return String(value || "").trim(); }
function safeGuid(value: string) { return value ? `${value.slice(0, 8)}...${value.slice(-6)}` : "Not set"; }
function safeOrderError(raw: string) {
  const text = String(raw || "");
  if (!text) return "";
  if (text.includes("TAZWORKS_CLIENT_ACCESS_DENIED")) return "This dashboard is not allowed to access the selected client.";
  if (text.includes("TAZWORKS_CLIENT_ACCESS_NOT_CONFIGURED")) return "This dashboard is missing its assigned client GUID.";
  if (text.toLowerCase().includes("fetch failed")) return "The TazWorks proxy could not be reached. Check the proxy URL, HTTPS, and Vercel redeploy.";
  if (text.includes("NOT_AUTHORIZED") || text.toLowerCase().includes("not authorized")) return "TazWorks returned NOT_AUTHORIZED. The app reached TazWorks, but the API credential or selected client access was rejected.";
  if (text.includes("NOT_AUTHENTICATED") || text.toLowerCase().includes("not authenticated")) return "TazWorks returned NOT_AUTHENTICATED. The API credential may be missing, expired, or copied incorrectly.";
  if (text.includes("401")) return "The fixed-IP proxy rejected the request. Check TAZWORKS_PROXY_SECRET in Vercel.";
  if (text.includes("404")) return "TazWorks returned not found. Check the live base URL and selected client GUID.";
  if (text.includes("429")) return "TazWorks returned a rate limit response. Wait and try again.";
  return `TazWorks order pull failed: ${text.slice(0, 240)}`;
}

function recentOrdersUrl(clientGuid: string) {
  return clientGuid ? `/tazworks/orders?clientGuid=${encodeURIComponent(clientGuid)}&pull=1` : "/tazworks/orders?pull=1";
}

export default async function TazworksOrdersPage({ searchParams }: { searchParams: Promise<{ clientGuid?: string; clientName?: string; clientCode?: string; fileNumber?: string; pull?: string; error?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const params = await searchParams;
  const status = getTazworksStatus();
  let defaultClientGuid = "";
  try { defaultClientGuid = getDefaultTazworksClientGuid(); } catch {}
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
  const savedOptions = filterTazworksClientOptions(savedClients.map((client) => ({ guid: client.client_guid, name: client.name, code: client.client_code || "", label: client.client_code ? `${client.name} (${client.client_code})` : client.name })));
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
  const noResultsText = selectedClientGuid && shouldPull ? fileNumber ? `No order with file number ${fileNumber} was returned for the selected client.` : "No recent orders returned for the selected client." : "Choose a client, then search by file number or pull 2 recent orders.";
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>Taz Orders</h1><div className="card" style={{ background: status.sandboxMode ? "#f8fafc" : "#fff7ed", borderColor: status.sandboxMode ? "#cbd5e1" : "#fdba74", padding: 16, marginBottom: 18 }}><strong>{status.sandboxMode ? "Sandbox Mode" : "Live TazWorks Mode"}</strong><p style={{ marginBottom: 0 }}>Read-only order access. This page pulls order information from TazWorks and never creates, edits, submits, cancels, or updates TazWorks orders.</p></div><section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14, marginBottom: 18 }}><div className="card" style={{ padding: 16 }}><strong>Selected Client</strong><p style={{ marginBottom: 4 }}>{selectedClientLabel}</p><span style={{ color: "#5d687b", fontSize: 12 }}>GUID: {safeGuid(selectedClientGuid)}</span></div><div className="card" style={{ padding: 16 }}><strong>Search Mode</strong><p style={{ marginBottom: 4 }}>{fileNumber ? `File #${fileNumber}` : shouldPull ? "Recent orders" : "Ready"}</p><span style={{ color: "#5d687b", fontSize: 12 }}>Use file number first when possible.</span></div><div className="card" style={{ padding: 16 }}><strong>Client Sources</strong><p style={{ marginBottom: 4 }}>{savedOptions.length} saved / {liveClients.length} live</p><span style={{ color: "#5d687b", fontSize: 12 }}>{status.clientAccessLocked ? "Client access locked" : "Admin multi-client"}</span></div></section><section className="card" style={{ padding: 18, marginBottom: 18 }}><h2 style={{ marginTop: 0 }}>Pull Orders</h2><form method="get" action="/tazworks/orders" style={{ display: "grid", gap: 14 }}><input type="hidden" name="pull" value="1" /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, alignItems: "end" }}>{clients.length ? <label><span className="field-label">Step 1 — Client</span><select className="field-input" name="clientGuid" defaultValue={selectedClientGuid}><option value="">Select client...</option>{clients.map((client) => <option key={client.guid} value={client.guid}>{client.label}</option>)}</select></label> : <label><span className="field-label">Step 1 — Client GUID</span><input className="field-input" name="clientGuid" defaultValue={selectedClientGuid} placeholder="TazWorks client GUID" /></label>}<label><span className="field-label">Step 2 — File Number</span><input className="field-input" name="fileNumber" defaultValue={fileNumber} placeholder="Recommended for live orders" /></label><button className="btn-primary" type="submit">Search File Number</button></div><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Link className="btn-secondary" href={recentOrdersUrl(selectedClientGuid)}>Pull 2 Recent</Link><Link className="btn-secondary" href="/tazworks/clients">Manage Clients</Link><Link className="btn-muted" href="/tazworks/orders">Clear</Link></div></form>{clientsError ? <p style={{ color: "#b42318", fontWeight: 700, marginBottom: 0 }}>Live client list did not load. Saved clients and manual GUID entry still work.</p> : null}</section>{safeError ? <div className="card" style={{ borderColor: "#fda29b", background: "#fff5f5", color: "#b42318", fontWeight: 700, marginBottom: 18, padding: 16 }}><p style={{ marginTop: 0 }}>{safeError}</p><p style={{ marginBottom: 0 }}>Check the selected client, proxy URL, proxy secret, token, and TazWorks access. The app did not change anything in TazWorks.</p></div> : null}<section className="card table-wrap"><div style={{ padding: 18 }}><h2 style={{ margin: 0 }}>Order Results</h2><p style={{ color: "#5d687b", marginBottom: 0 }}>{orders.length ? `${orders.length} order${orders.length === 1 ? "" : "s"} shown.` : noResultsText}</p></div><table><thead><tr><th>File #</th><th>Applicant</th><th>Status</th><th>Client</th><th>Product</th><th>Ordered</th><th>Action</th></tr></thead><tbody>{orders.length ? orders.map((row: any) => { const rowClientName = row.clientName || clientName; const rowClientCode = row.clientCode || clientCode; return <tr key={row.orderGuid}><td>{row.fileNumber || ""}</td><td>{row.applicantName || ""}</td><td>{row.orderStatus || ""}</td><td>{rowClientName || rowClientCode || ""}</td><td>{row.productName || ""}</td><td>{row.orderedDate ? new Date(row.orderedDate).toLocaleString() : ""}</td><td><Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/tazworks/orders/${row.orderGuid}?clientGuid=${encodeURIComponent(selectedClientGuid)}&clientName=${encodeURIComponent(rowClientName || "")}&clientCode=${encodeURIComponent(rowClientCode || "")}&fileNumber=${encodeURIComponent(String(row.fileNumber || ""))}`}>View Searches</Link></td></tr>; }) : <tr><td colSpan={7}>{noResultsText}</td></tr>}</tbody></table></section></main></>;
}
