import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { getDefaultTazworksClientGuid, getTazworksStatus, listTazworksOrders } from "@/lib/tazworks";
import { requireUser } from "@/lib/session";

function cleanFileNumber(value?: string) { return String(value || "").trim(); }

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
      const data = await listTazworksOrders(clientGuid, 0, fileNumber ? 100 : 10);
      const rows = Array.isArray(data) ? data : data?.content || data?.items || data?.orders || [];
      orders = fileNumber ? rows.filter((row: any) => String(row.fileNumber || "") === fileNumber) : rows;
    } catch (err: any) {
      error = err?.message || "orders_pull_failed";
    }
  }
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>TazWorks Orders</h1><div className="card" style={{ background: status.sandboxMode ? "#f8fafc" : "#fff7ed", borderColor: status.sandboxMode ? "#cbd5e1" : "#fdba74", padding: 16, marginBottom: 18 }}><strong>{status.sandboxMode ? "Sandbox Mode" : "Live TazWorks Mode"}</strong><p style={{ marginBottom: 0 }}>This page is read-only. It only pulls order information from TazWorks. It does not create, edit, submit, cancel, or update TazWorks orders.</p></div><p style={{ color: "#5d687b" }}>For live use, search by file number when possible. Pull Recent only loads a small read-only list.</p><section className="card" style={{ padding: 18, marginBottom: 18 }}><form method="get" action="/tazworks/orders" style={{ display: "grid", gap: 12 }}><input type="hidden" name="pull" value="1" /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, alignItems: "end" }}><label><span className="field-label">Client GUID</span><input className="field-input" name="clientGuid" defaultValue={clientGuid} placeholder="TazWorks client GUID" /></label><label><span className="field-label">File Number</span><input className="field-input" name="fileNumber" defaultValue={fileNumber} placeholder="Optional, safer for live" /></label><button className="btn-primary" type="submit">Search / Pull Orders</button><Link className="btn-secondary" href="/tazworks/clients">Choose Client</Link></div></form></section>{error ? <p style={{ color: "#b42318", fontWeight: 700 }}>Could not pull orders. Check the client GUID and TazWorks access.</p> : null}<section className="card table-wrap"><table><thead><tr><th>File #</th><th>Applicant</th><th>Status</th><th>Client</th><th>Product</th><th>Ordered</th><th>Action</th></tr></thead><tbody>{orders.length ? orders.map((row: any) => <tr key={row.orderGuid}><td>{row.fileNumber || ""}</td><td>{row.applicantName || ""}</td><td>{row.orderStatus || ""}</td><td>{row.clientName || row.clientCode || ""}</td><td>{row.productName || ""}</td><td>{row.orderedDate ? new Date(row.orderedDate).toLocaleString() : ""}</td><td><Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/tazworks/orders/${row.orderGuid}?clientGuid=${encodeURIComponent(clientGuid)}&fileNumber=${encodeURIComponent(String(row.fileNumber || ""))}`}>View Searches</Link></td></tr>) : <tr><td colSpan={7}>{clientGuid && shouldPull ? "No matching orders returned." : "Enter a file number or click Search / Pull Orders."}</td></tr>}</tbody></table></section></main></>;
}
