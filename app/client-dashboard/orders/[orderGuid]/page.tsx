import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getTazworksAllowedClientGuids, resolveTazworksClientGuid } from "@/lib/tazworksAccess";
import { listTazworksOrderSearches } from "@/lib/tazworks";

function safeError(raw: string) {
  if (raw.includes("TAZWORKS_CLIENT_ACCESS_DENIED")) return "Order access could not be verified.";
  if (raw.includes("fetch failed")) return "The order connection is currently unavailable.";
  return raw ? "Searches could not be loaded." : "";
}

export default async function ClientDashboardOrderSearchesPage({ params, searchParams }: { params: Promise<{ orderGuid: string }>; searchParams: Promise<{ fileNumber?: string }> }) {
  await requireUser(["admin", "supervisor", "reviewer"]);
  const { orderGuid } = await params;
  const query = await searchParams;
  const clientGuid = resolveTazworksClientGuid(getTazworksAllowedClientGuids()[0] || "");
  const fileNumber = String(query.fileNumber || "");
  let searches: any[] = [];
  let error = "";
  try {
    const data = await listTazworksOrderSearches(clientGuid, orderGuid);
    searches = Array.isArray(data) ? data : data?.content || data?.items || data?.searches || [];
  } catch (err: any) { error = err?.message || "searches_failed"; }
  const message = safeError(error);
  return <main className="container-shell"><Link href={`/client-dashboard/orders${fileNumber ? `?fileNumber=${encodeURIComponent(fileNumber)}&pull=1` : ""}`} style={{ color: "#0f3b5f", fontWeight: 800 }}>← Back to Orders</Link><h1>Order Searches</h1><p style={{ color: "#5d687b" }}>Order GUID: {orderGuid}{fileNumber ? ` | File #: ${fileNumber}` : ""}</p>{message ? <div className="card" style={{ borderColor: "#fda29b", background: "#fff5f5", color: "#b42318", fontWeight: 700, marginBottom: 18, padding: 16 }}>{message}</div> : null}<section className="card table-wrap"><table><thead><tr><th>Search</th><th>Type</th><th>Status</th><th>Result</th><th>Modified</th><th>Action</th></tr></thead><tbody>{searches.length ? searches.map((row: any) => <tr key={row.orderSearchGuid}><td>{row.displayName || row.displayValue || row.orderSearchGuid}</td><td>{row.type || ""}</td><td>{row.status || ""}</td><td>{row.result || ""}</td><td>{row.modifiedDate ? new Date(row.modifiedDate).toLocaleString() : ""}</td><td><Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/client-dashboard/orders/${orderGuid}/searches/${row.orderSearchGuid}?fileNumber=${encodeURIComponent(fileNumber)}`}>View Result</Link></td></tr>) : <tr><td colSpan={6}>No searches returned.</td></tr>}</tbody></table></section></main>;
}
