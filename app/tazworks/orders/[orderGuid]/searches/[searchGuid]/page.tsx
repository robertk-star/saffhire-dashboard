import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { getTazworksSearchResult, reviewTypeFromTazworksPayload } from "@/lib/tazworks";
import { requireUser } from "@/lib/session";

export default async function TazworksSearchResultPage({ params, searchParams }: { params: Promise<{ orderGuid: string; searchGuid: string }>; searchParams: Promise<{ clientGuid?: string; error?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const { orderGuid, searchGuid } = await params;
  const query = await searchParams;
  const clientGuid = query.clientGuid || "";
  let payload: any = null;
  let error = query.error || "";
  if (clientGuid && orderGuid && searchGuid) {
    try { payload = await getTazworksSearchResult(clientGuid, orderGuid, searchGuid); } catch (err: any) { error = err?.message || "result_pull_failed"; }
  }
  const reviewType = payload ? reviewTypeFromTazworksPayload(payload) : "national_crim";
  return <><AppHeader user={user} /><main className="container-shell"><Link href={`/tazworks/orders/${orderGuid}?clientGuid=${encodeURIComponent(clientGuid)}`} style={{ color: "#0f3b5f", fontWeight: 800 }}>← Back to Searches</Link><h1>TazWorks Search Result</h1><p style={{ color: "#5d687b" }}>Search GUID: {searchGuid}</p>{error ? <p style={{ color: "#b42318", fontWeight: 700 }}>Could not pull search result.</p> : null}{payload ? <><section className="card" style={{ padding: 18, marginBottom: 18 }}><p><strong>Search Type:</strong> {payload.type || "Unknown"}</p><p><strong>Status:</strong> {payload.status || "Unknown"}</p><p><strong>Result:</strong> {payload.result || "Unknown"}</p><p><strong>Suggested Analyzer:</strong> {reviewType === "county_search" ? "County Search" : "National Crim"}</p><form action="/api/tazworks/search-results/import" method="post"><input type="hidden" name="clientGuid" value={clientGuid} /><input type="hidden" name="orderGuid" value={orderGuid} /><input type="hidden" name="searchGuid" value={searchGuid} /><button className="btn-primary" type="submit">Analyze in Quick Analyze</button></form></section><section className="card" style={{ padding: 18 }}><h2 style={{ marginTop: 0 }}>Raw Result</h2><pre style={{ background: "#f8fafc", borderRadius: 12, maxHeight: 620, overflow: "auto", padding: 16, whiteSpace: "pre-wrap" }}>{JSON.stringify(payload, null, 2)}</pre></section></> : null}</main></>;
}
