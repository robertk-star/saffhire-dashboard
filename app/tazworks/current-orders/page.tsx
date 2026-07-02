import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";
import { getDefaultTazworksClientGuid, getTazworksStatus, listTazworksOrders } from "@/lib/tazworks";
import { filterTazworksClientOptions } from "@/lib/tazworksAccess";
import { listTazworksSavedClients } from "@/lib/tazworksSavedClients";

function isCurrent(row: any) {
  const status = String(row?.orderStatus || row?.status || "").toLowerCase();
  return !(status.includes("complete") || status.includes("closed") || status.includes("cancel"));
}

function shortGuid(value: string) {
  return value ? `${value.slice(0, 8)}...${value.slice(-6)}` : "Not set";
}

export default async function CurrentOrdersPage({ searchParams }: { searchParams: Promise<{ size?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const params = await searchParams;
  const status = getTazworksStatus();
  const size = Math.min(Math.max(Number(params.size || 50) || 50, 10), 100);
  const savedRows = await listTazworksSavedClients(false).catch(() => []);
  let clients = filterTazworksClientOptions(savedRows.map((client) => ({ guid: client.client_guid, name: client.name, code: client.client_code || "", label: client.client_code ? `${client.name} (${client.client_code})` : client.name })));
  if (!clients.length) {
    let fallbackGuid = "";
    try { fallbackGuid = getDefaultTazworksClientGuid(); } catch {}
    if (fallbackGuid) clients = [{ guid: fallbackGuid, name: "Default Client", code: "", label: "Default Client" }];
  }
  const orders: any[] = [];
  const errors: string[] = [];
  for (const client of clients) {
    try {
      const data = await listTazworksOrders(client.guid, 0, size);
      const rows = Array.isArray(data) ? data : data?.content || data?.items || data?.orders || [];
      for (const row of rows) if (isCurrent(row)) orders.push({ ...row, _clientGuid: client.guid, _clientName: row.clientName || client.name, _clientCode: row.clientCode || client.code, _clientLabel: client.label });
    } catch {
      errors.push(client.label);
    }
  }
  orders.sort((a, b) => String(b.orderedDate || b.createdDate || "").localeCompare(String(a.orderedDate || a.createdDate || "")));
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>Current Taz Orders</h1><div className="card" style={{ background: status.sandboxMode ? "#f8fafc" : "#fff7ed", borderColor: status.sandboxMode ? "#cbd5e1" : "#fdba74", padding: 16, marginBottom: 18 }}><strong>{status.sandboxMode ? "Sandbox Mode" : "Live TazWorks Mode"}</strong><p style={{ marginBottom: 0 }}>Read-only current order list. Orders that look complete, closed, or canceled are hidden.</p></div><section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14, marginBottom: 18 }}><div className="card" style={{ padding: 16 }}><strong>Current Orders</strong><p style={{ marginBottom: 0 }}>{orders.length}</p></div><div className="card" style={{ padding: 16 }}><strong>Clients Checked</strong><p style={{ marginBottom: 0 }}>{clients.length}</p></div><div className="card" style={{ padding: 16 }}><strong>Rows Per Client</strong><p style={{ marginBottom: 0 }}>{size}</p></div><div className="card" style={{ padding: 16 }}><strong>Pull Warnings</strong><p style={{ marginBottom: 0 }}>{errors.length}</p></div></section><section className="card" style={{ padding: 18, marginBottom: 18 }}><form method="get" action="/tazworks/current-orders" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}><label><span className="field-label">Rows to check per client</span><select className="field-input" name="size" defaultValue={String(size)}><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label><button className="btn-primary" type="submit">Refresh Current Orders</button><Link className="btn-secondary" href="/tazworks/orders">Pull by File Number</Link><Link className="btn-secondary" href="/tazworks/clients">Manage Clients</Link></form></section>{!clients.length ? <div className="card" style={{ borderColor: "#fda29b", background: "#fff5f5", color: "#b42318", fontWeight: 700, marginBottom: 18, padding: 16 }}>No saved active clients or default client GUID are available.</div> : null}{errors.length ? <div className="card" style={{ borderColor: "#fda29b", background: "#fff5f5", color: "#b42318", fontWeight: 700, marginBottom: 18, padding: 16 }}>Could not pull orders for: {errors.join(", ")}</div> : null}<section className="card table-wrap"><div style={{ padding: 18 }}><h2 style={{ margin: 0 }}>Not Complete Orders</h2><p style={{ color: "#5d687b", marginBottom: 0 }}>Complete, closed, and canceled statuses are hidden.</p></div><table><thead><tr><th>File #</th><th>Applicant</th><th>Client</th><th>Status</th><th>Product</th><th>Ordered</th><th>Last Updated</th><th>Action</th></tr></thead><tbody>{orders.length ? orders.map((row: any) => <tr key={`${row._clientGuid}-${row.orderGuid || row.fileNumber}`}><td>{row.fileNumber || ""}</td><td>{row.applicantName || ""}</td><td>{row._clientName || row._clientLabel || ""}<br /><span style={{ color: "#5d687b", fontSize: 11 }}>GUID: {shortGuid(row._clientGuid)}</span></td><td>{row.orderStatus || row.status || ""}</td><td>{row.productName || ""}</td><td>{row.orderedDate ? new Date(row.orderedDate).toLocaleString() : ""}</td><td>{row.modifiedDate ? new Date(row.modifiedDate).toLocaleString() : row.updatedDate ? new Date(row.updatedDate).toLocaleString() : ""}</td><td>{row.orderGuid ? <Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/tazworks/orders/${row.orderGuid}?clientGuid=${encodeURIComponent(row._clientGuid)}&clientName=${encodeURIComponent(row._clientName || "")}&clientCode=${encodeURIComponent(row._clientCode || "")}&fileNumber=${encodeURIComponent(String(row.fileNumber || ""))}`}>View Details</Link> : "No order GUID"}</td></tr>) : <tr><td colSpan={8}>No current orders found in the checked rows.</td></tr>}</tbody></table></section></main></>;
}
