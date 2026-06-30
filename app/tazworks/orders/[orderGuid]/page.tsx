import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { getImportedTazworksSearchMap, getTazworksStatus, listTazworksOrderSearches } from "@/lib/tazworks";
import { requireUser } from "@/lib/session";

function clientLabel(name?: string, code?: string) {
  if (name && code) return `${name} (${code})`;
  return name || code || "Client not named";
}

export default async function TazworksOrderSearchesPage({ params, searchParams }: { params: Promise<{ orderGuid: string }>; searchParams: Promise<{ clientGuid?: string; clientName?: string; clientCode?: string; fileNumber?: string; error?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const { orderGuid } = await params;
  const query = await searchParams;
  const status = getTazworksStatus();
  const clientGuid = query.clientGuid || "";
  const clientName = query.clientName || "";
  const clientCode = query.clientCode || "";
  const fileNumber = query.fileNumber || "";
  let searches: any[] = [];
  let imported: Record<string, any> = {};
  let error = query.error || "";
  if (clientGuid && orderGuid) {
    try {
      const data = await listTazworksOrderSearches(clientGuid, orderGuid);
      searches = Array.isArray(data) ? data : data?.content || data?.items || data?.searches || [];
      imported = await getImportedTazworksSearchMap(searches.map((row: any) => row.orderSearchGuid).filter(Boolean));
    } catch (err: any) {
      error = err?.message || "searches_pull_failed";
    }
  }
  const backUrl = `/tazworks/orders?clientGuid=${encodeURIComponent(clientGuid)}&clientName=${encodeURIComponent(clientName)}&clientCode=${encodeURIComponent(clientCode)}${fileNumber ? `&fileNumber=${encodeURIComponent(fileNumber)}&pull=1` : ""}`;
  return <><AppHeader user={user} /><main className="container-shell"><Link href={backUrl} style={{ color: "#0f3b5f", fontWeight: 800 }}>← Back to Orders</Link><h1>TazWorks Order Searches</h1><div className="card" style={{ background: status.sandboxMode ? "#f8fafc" : "#fff7ed", borderColor: status.sandboxMode ? "#cbd5e1" : "#fdba74", padding: 16, marginBottom: 18 }}><strong>{status.sandboxMode ? "Sandbox Mode" : "Live TazWorks Mode"}</strong><p style={{ marginBottom: 0 }}>This page only pulls search information from TazWorks. To analyze, open the result first and confirm the import.</p></div><p style={{ color: "#5d687b" }}>Client: {clientLabel(clientName, clientCode)} | Order GUID: {orderGuid}{fileNumber ? ` | File #: ${fileNumber}` : ""}</p>{error ? <p style={{ color: "#b42318", fontWeight: 700 }}>Could not pull searches. Check the selected client and order GUID.</p> : null}<section className="card table-wrap"><table><thead><tr><th>Search</th><th>Type</th><th>Status</th><th>Result</th><th>Imported</th><th>Modified</th><th>Action</th></tr></thead><tbody>{searches.length ? searches.map((row: any) => { const hit = imported[row.orderSearchGuid]; return <tr key={row.orderSearchGuid}><td>{row.displayName || row.displayValue || row.orderSearchGuid}</td><td>{row.type || ""}</td><td>{row.status || ""}</td><td>{row.result || ""}</td><td>{hit?.quickReviewId ? <Link style={{ color: "#167f49", fontWeight: 800 }} href={`/analyze/${hit.quickReviewId}`}>Imported</Link> : "Not imported"}</td><td>{row.modifiedDate ? new Date(row.modifiedDate).toLocaleString() : ""}</td><td><Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/tazworks/orders/${orderGuid}/searches/${row.orderSearchGuid}?clientGuid=${encodeURIComponent(clientGuid)}&clientName=${encodeURIComponent(clientName)}&clientCode=${encodeURIComponent(clientCode)}&fileNumber=${encodeURIComponent(fileNumber)}`}>View Result</Link></td></tr>; }) : <tr><td colSpan={7}>{clientGuid ? "No searches returned." : "Missing client GUID."}</td></tr>}</tbody></table></section></main></>;
}
