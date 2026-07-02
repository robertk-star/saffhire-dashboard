import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";
import { getDefaultTazworksClientGuid, getTazworksStatus, listTazworksClients, listTazworksOrders, normalizeTazworksClientList } from "@/lib/tazworks";
import { filterTazworksClientOptions } from "@/lib/tazworksAccess";
import { listTazworksSavedClients } from "@/lib/tazworksSavedClients";

function cleanStatus(value: any) {
  return String(value || "").trim().toLowerCase().replace(/[\-_]+/g, " ").replace(/\s+/g, " ");
}

function isArchived(row: any) {
  const status = cleanStatus(row?.orderStatus || row?.status || row?.orderState || row?.state);
  if (status.includes("archive")) return true;
  const archivedValue = row?.archived ?? row?.isArchived ?? row?.archive ?? row?.archivedAt ?? row?.archiveDate;
  if (archivedValue === true) return true;
  if (typeof archivedValue === "string") {
    const value = archivedValue.trim().toLowerCase();
    return Boolean(value && value !== "false" && value !== "0" && value !== "no");
  }
  return Boolean(archivedValue);
}

function isCurrent(row: any) {
  if (isArchived(row)) return false;
  const status = cleanStatus(row?.orderStatus || row?.status || "");
  return !(status.includes("complete") || status.includes("closed") || status.includes("cancel"));
}

function matchesStatusFilter(row: any, statusFilter: string) {
  const status = cleanStatus(row?.orderStatus || row?.status || "");
  if (!statusFilter || statusFilter === "all") return true;
  if (statusFilter === "pending") return status === "pending";
  if (statusFilter === "pending_review") return status === "pending review";
  if (statusFilter === "app_pending") return status === "app pending" || status === "application pending";
  return true;
}

function statusLabel(statusFilter: string) {
  if (statusFilter === "pending") return "Pending";
  if (statusFilter === "pending_review") return "Pending Review";
  if (statusFilter === "app_pending") return "App Pending";
  return "All Current";
}

export default async function CurrentOrdersPage({ searchParams }: { searchParams: Promise<{ size?: string; status?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const params = await searchParams;
  const status = getTazworksStatus();
  const size = Math.min(Math.max(Number(params.size || 50) || 50, 10), 100);
  const statusFilter = String(params.status || "all");
  const savedRows = await listTazworksSavedClients(false).catch(() => []);
  const clientMap = new Map<string, { guid: string; name: string; code: string; label: string; source: string }>();
  const savedClients = filterTazworksClientOptions(savedRows.map((client) => ({ guid: client.client_guid, name: client.name, code: client.client_code || "", label: client.client_code ? `${client.name} (${client.client_code})` : client.name, source: "Saved" })));
  for (const client of savedClients) clientMap.set(client.guid, client);
  let liveClientError = "";
  try {
    const liveData = await listTazworksClients(0, 100);
    const liveClients = normalizeTazworksClientList(liveData).map((client) => ({ guid: client.guid, name: client.name, code: client.code, label: client.label, source: "Live" }));
    for (const client of liveClients) if (!clientMap.has(client.guid)) clientMap.set(client.guid, client);
  } catch (err: any) {
    liveClientError = err?.message || "live_clients_failed";
  }
  if (!clientMap.size) {
    let fallbackGuid = "";
    try { fallbackGuid = getDefaultTazworksClientGuid(); } catch {}
    if (fallbackGuid) clientMap.set(fallbackGuid, { guid: fallbackGuid, name: "Default Client", code: "", label: "Default Client", source: "Default" });
  }
  const clients = Array.from(clientMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  const orders: any[] = [];
  const errors: string[] = [];
  for (const client of clients) {
    try {
      const data = await listTazworksOrders(client.guid, 0, size);
      const rows = Array.isArray(data) ? data : data?.content || data?.items || data?.orders || [];
      for (const row of rows) if (isCurrent(row) && matchesStatusFilter(row, statusFilter)) orders.push({ ...row, _clientGuid: client.guid, _clientName: row.clientName || client.name, _clientCode: row.clientCode || client.code, _clientLabel: client.label, _clientSource: client.source });
    } catch {
      errors.push(client.label);
    }
  }
  orders.sort((a, b) => String(b.orderedDate || b.createdDate || "").localeCompare(String(a.orderedDate || a.createdDate || "")));
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>Current Taz Orders</h1><div className="card" style={{ background: status.sandboxMode ? "#f8fafc" : "#fff7ed", borderColor: status.sandboxMode ? "#cbd5e1" : "#fdba74", padding: 16, marginBottom: 18 }}><strong>{status.sandboxMode ? "Sandbox Mode" : "Live TazWorks Mode"}</strong><p style={{ marginBottom: 0 }}>Read-only current order list. Archived orders are always hidden. Complete, closed, and canceled orders are hidden.</p></div><section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14, marginBottom: 18 }}><div className="card" style={{ padding: 16 }}><strong>Orders Shown</strong><p style={{ marginBottom: 0 }}>{orders.length}</p></div><div className="card" style={{ padding: 16 }}><strong>Status Filter</strong><p style={{ marginBottom: 0 }}>{statusLabel(statusFilter)}</p></div><div className="card" style={{ padding: 16 }}><strong>Clients Checked</strong><p style={{ marginBottom: 0 }}>{clients.length}</p></div><div className="card" style={{ padding: 16 }}><strong>Pull Warnings</strong><p style={{ marginBottom: 0 }}>{errors.length + (liveClientError ? 1 : 0)}</p></div></section><section className="card" style={{ padding: 18, marginBottom: 18 }}><form method="get" action="/tazworks/current-orders" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}><label><span className="field-label">Status</span><select className="field-input" name="status" defaultValue={statusFilter}><option value="all">All Current</option><option value="pending">Pending</option><option value="pending_review">Pending Review</option><option value="app_pending">App Pending</option></select></label><label><span className="field-label">Rows to check per client</span><select className="field-input" name="size" defaultValue={String(size)}><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label><button className="btn-primary" type="submit">Apply Filter</button><Link className="btn-secondary" href="/tazworks/current-orders">Clear Filter</Link><Link className="btn-secondary" href="/tazworks/orders">Pull by File Number</Link><Link className="btn-secondary" href="/tazworks/clients">Manage Clients</Link></form></section>{!clients.length ? <div className="card" style={{ borderColor: "#fda29b", background: "#fff5f5", color: "#b42318", fontWeight: 700, marginBottom: 18, padding: 16 }}>No saved, live, or fallback client GUIDs are available.</div> : null}{liveClientError ? <div className="card" style={{ borderColor: "#fdba74", background: "#fff7ed", color: "#9a3412", fontWeight: 700, marginBottom: 18, padding: 16 }}>Live client list did not load. Saved clients and fallback client were still checked.</div> : null}{errors.length ? <div className="card" style={{ borderColor: "#fda29b", background: "#fff5f5", color: "#b42318", fontWeight: 700, marginBottom: 18, padding: 16 }}>Could not pull orders for: {errors.join(", ")}</div> : null}<section className="card table-wrap"><div style={{ padding: 18 }}><h2 style={{ margin: 0 }}>{statusLabel(statusFilter)} Orders</h2><p style={{ color: "#5d687b", marginBottom: 0 }}>Archived, complete, closed, and canceled orders are hidden.</p></div><table><thead><tr><th>File #</th><th>Applicant</th><th>Client</th><th>Status</th><th>Product</th><th>Ordered</th><th>Last Updated</th><th>Action</th></tr></thead><tbody>{orders.length ? orders.map((row: any) => <tr key={`${row._clientGuid}-${row.orderGuid || row.fileNumber}`}><td>{row.fileNumber || ""}</td><td>{row.applicantName || ""}</td><td>{row._clientName || row._clientLabel || ""}</td><td>{row.orderStatus || row.status || ""}</td><td>{row.productName || ""}</td><td>{row.orderedDate ? new Date(row.orderedDate).toLocaleString() : ""}</td><td>{row.modifiedDate ? new Date(row.modifiedDate).toLocaleString() : row.updatedDate ? new Date(row.updatedDate).toLocaleString() : ""}</td><td>{row.orderGuid ? <Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/tazworks/orders/${row.orderGuid}?clientGuid=${encodeURIComponent(row._clientGuid)}&clientName=${encodeURIComponent(row._clientName || "")}&clientCode=${encodeURIComponent(row._clientCode || "")}&fileNumber=${encodeURIComponent(String(row.fileNumber || ""))}`}>View Details</Link> : "No order GUID"}</td></tr>) : <tr><td colSpan={8}>No matching current orders found.</td></tr>}</tbody></table></section></main></>;
}
