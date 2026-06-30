import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getTazworksAllowedClientGuids, getTazworksAccessStatus, resolveTazworksClientGuid } from "@/lib/tazworksAccess";
import { listTazworksOrders } from "@/lib/tazworks";

function cleanFileNumber(value?: string) { return String(value || "").trim(); }
function safeError(raw: string) {
  if (raw.includes("TAZWORKS_CLIENT_ACCESS_DENIED")) return "Order access could not be verified.";
  if (raw.includes("TAZWORKS_CLIENT_ACCESS_NOT_CONFIGURED")) return "This dashboard is missing its assigned client setup.";
  if (raw.includes("fetch failed")) return "The order connection is currently unavailable.";
  return raw ? "Orders could not be loaded." : "";
}

export default async function ClientDashboardOrdersPage({ searchParams }: { searchParams: Promise<{ fileNumber?: string; pull?: string }> }) {
  await requireUser(["admin", "supervisor", "reviewer"]);
  const params = await searchParams;
  const access = getTazworksAccessStatus();
  const clientGuid = resolveTazworksClientGuid(getTazworksAllowedClientGuids()[0] || "");
  const fileNumber = cleanFileNumber(params.fileNumber);
  const shouldPull = Boolean(params.pull || fileNumber);
  let orders: any[] = [];
  let error = "";
  if (clientGuid && shouldPull) {
    try {
      const data = await listTazworksOrders(clientGuid, 0, fileNumber ? 10 : 5);
      const rows = Array.isArray(data) ? data : data?.content || data?.items || data?.orders || [];
      orders = fileNumber ? rows.filter((row: any) => String(row.fileNumber || "") === fileNumber) : rows;
    } catch (err: any) { error = err?.message || "orders_failed"; }
  }
  const message = safeError(error);
  return <main className="container-shell"><Link href="/client-dashboard" style={{ color: "#0f3b5f", fontWeight: 800 }}>← Dashboard Home</Link><h1>Orders</h1><p style={{ color: "#5d687b" }}>Read-only order lookup. Client access is {access.lockedMode ? "locked" : "not locked"}.</p><section className="card" style={{ padding: 18, marginBottom: 18 }}><form method="get" action="/client-dashboard/orders" style={{ display: "grid", gap: 12 }}><input type="hidden" name="pull" value="1" /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, alignItems: "end" }}><label><span className="field-label">File Number</span><input className="field-input" name="fileNumber" defaultValue={fileNumber} placeholder="Search by file number" /></label><button className="btn-primary" type="submit">Search Orders</button><Link className="btn-secondary" href="/client-dashboard/orders?pull=1">Pull Recent</Link></div></form></section>{message ? <div className="card" style={{ borderColor: "#fda29b", background: "#fff5f5", color: "#b42318", fontWeight: 700, marginBottom: 18, padding: 16 }}>{message}</div> : null}<section className="card table-wrap"><table><thead><tr><th>File #</th><th>Applicant</th><th>Status</th><th>Product</th><th>Ordered</th><th>Action</th></tr></thead><tbody>{orders.length ? orders.map((row: any) => <tr key={row.orderGuid}><td>{row.fileNumber || ""}</td><td>{row.applicantName || ""}</td><td>{row.orderStatus || ""}</td><td>{row.productName || ""}</td><td>{row.orderedDate ? new Date(row.orderedDate).toLocaleString() : ""}</td><td><Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/client-dashboard/orders/${row.orderGuid}?fileNumber=${encodeURIComponent(String(row.fileNumber || ""))}`}>View Searches</Link></td></tr>) : <tr><td colSpan={6}>{shouldPull ? "No matching orders returned." : "Search by file number or pull recent orders."}</td></tr>}</tbody></table></section></main>;
}
