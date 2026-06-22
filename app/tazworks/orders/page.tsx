import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { getDefaultTazworksClientGuid, listTazworksOrders } from "@/lib/tazworks";
import { requireUser } from "@/lib/session";

export default async function TazworksOrdersPage({ searchParams }: { searchParams: Promise<{ clientGuid?: string; error?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const params = await searchParams;
  const clientGuid = params.clientGuid || getDefaultTazworksClientGuid();
  let orders: any[] = [];
  let error = params.error || "";
  if (clientGuid) {
    try {
      const data = await listTazworksOrders(clientGuid, 0, 50);
      orders = Array.isArray(data) ? data : data?.content || data?.items || data?.orders || [];
    } catch (err: any) {
      error = err?.message || "orders_pull_failed";
    }
  }
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>TazWorks Orders</h1><p style={{ color: "#5d687b" }}>Pull recent orders for a TazWorks client and open searches/results.</p><section className="card" style={{ padding: 18, marginBottom: 18 }}><form method="get" action="/tazworks/orders" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}><label style={{ flex: "1 1 420px" }}><span className="field-label">Client GUID</span><input className="field-input" name="clientGuid" defaultValue={clientGuid} placeholder="Paste TazWorks client GUID" /></label><button className="btn-primary" type="submit">Pull Orders</button><Link className="btn-secondary" href="/tazworks/clients">Choose Client</Link></form></section>{error ? <p style={{ color: "#b42318", fontWeight: 700 }}>Could not pull orders. Check the client GUID and TazWorks access.</p> : null}<section className="card table-wrap"><table><thead><tr><th>File #</th><th>Applicant</th><th>Status</th><th>Client</th><th>Product</th><th>Ordered</th><th>Action</th></tr></thead><tbody>{orders.length ? orders.map((row: any) => <tr key={row.orderGuid}><td>{row.fileNumber || ""}</td><td>{row.applicantName || ""}</td><td>{row.orderStatus || ""}</td><td>{row.clientName || row.clientCode || ""}</td><td>{row.productName || ""}</td><td>{row.orderedDate ? new Date(row.orderedDate).toLocaleString() : ""}</td><td><Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/tazworks/orders/${row.orderGuid}?clientGuid=${encodeURIComponent(clientGuid)}`}>View Searches</Link></td></tr>) : <tr><td colSpan={7}>{clientGuid ? "No orders returned." : "Enter a client GUID to pull orders."}</td></tr>}</tbody></table></section></main></>;
}
