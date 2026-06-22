import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { listTazworksOrderSearches } from "@/lib/tazworks";
import { requireUser } from "@/lib/session";

export default async function TazworksOrderSearchesPage({ params, searchParams }: { params: Promise<{ orderGuid: string }>; searchParams: Promise<{ clientGuid?: string; error?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const { orderGuid } = await params;
  const query = await searchParams;
  const clientGuid = query.clientGuid || "";
  let searches: any[] = [];
  let error = query.error || "";
  if (clientGuid && orderGuid) {
    try {
      const data = await listTazworksOrderSearches(clientGuid, orderGuid);
      searches = Array.isArray(data) ? data : data?.content || data?.items || data?.searches || [];
    } catch (err: any) {
      error = err?.message || "searches_pull_failed";
    }
  }
  return <><AppHeader user={user} /><main className="container-shell"><Link href={`/tazworks/orders?clientGuid=${encodeURIComponent(clientGuid)}`} style={{ color: "#0f3b5f", fontWeight: 800 }}>← Back to Orders</Link><h1>TazWorks Order Searches</h1><p style={{ color: "#5d687b" }}>Order GUID: {orderGuid}</p>{error ? <p style={{ color: "#b42318", fontWeight: 700 }}>Could not pull searches. Check the order/client GUID.</p> : null}<section className="card table-wrap"><table><thead><tr><th>Search</th><th>Type</th><th>Status</th><th>Result</th><th>Modified</th><th>Actions</th></tr></thead><tbody>{searches.length ? searches.map((row: any) => <tr key={row.orderSearchGuid}><td>{row.displayName || row.displayValue || row.orderSearchGuid}</td><td>{row.type || ""}</td><td>{row.status || ""}</td><td>{row.result || ""}</td><td>{row.modifiedDate ? new Date(row.modifiedDate).toLocaleString() : ""}</td><td style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/tazworks/orders/${orderGuid}/searches/${row.orderSearchGuid}?clientGuid=${encodeURIComponent(clientGuid)}`}>View Result</Link><form action="/api/tazworks/search-results/import" method="post"><input type="hidden" name="clientGuid" value={clientGuid} /><input type="hidden" name="orderGuid" value={orderGuid} /><input type="hidden" name="searchGuid" value={row.orderSearchGuid} /><button className="btn-secondary" type="submit">Analyze</button></form></td></tr>) : <tr><td colSpan={6}>{clientGuid ? "No searches returned." : "Missing client GUID."}</td></tr>}</tbody></table></section></main></>;
}
