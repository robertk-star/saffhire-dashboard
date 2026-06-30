import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { getImportedTazworksSearchMap, getTazworksSearchResult, getTazworksStatus, reviewTypeFromTazworksPayload } from "@/lib/tazworks";
import { requireUser } from "@/lib/session";

export default async function TazworksSearchResultPage({ params, searchParams }: { params: Promise<{ orderGuid: string; searchGuid: string }>; searchParams: Promise<{ clientGuid?: string; fileNumber?: string; error?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const { orderGuid, searchGuid } = await params;
  const query = await searchParams;
  const status = getTazworksStatus();
  const clientGuid = query.clientGuid || "";
  const fileNumber = query.fileNumber || "";
  let payload: any = null;
  let imported: any = null;
  let error = query.error || "";
  if (clientGuid && orderGuid && searchGuid) {
    try {
      payload = await getTazworksSearchResult(clientGuid, orderGuid, searchGuid);
      const map = await getImportedTazworksSearchMap([searchGuid]);
      imported = map[searchGuid];
    } catch (err: any) { error = err?.message || "result_pull_failed"; }
  }
  const reviewType = payload ? reviewTypeFromTazworksPayload(payload) : "national_crim";
  return <><AppHeader user={user} /><main className="container-shell"><Link href={`/tazworks/orders/${orderGuid}?clientGuid=${encodeURIComponent(clientGuid)}&fileNumber=${encodeURIComponent(fileNumber)}`} style={{ color: "#0f3b5f", fontWeight: 800 }}>← Back to Searches</Link><h1>TazWorks Search Result</h1><div className="card" style={{ background: status.sandboxMode ? "#f8fafc" : "#fff7ed", borderColor: status.sandboxMode ? "#cbd5e1" : "#fdba74", padding: 16, marginBottom: 18 }}><strong>{status.sandboxMode ? "Sandbox Mode" : "Live TazWorks Mode"}</strong><p style={{ marginBottom: 0 }}>Viewing this page only pulls data from TazWorks. Clicking the confirm button below saves a copy to SaffHire and runs Quick Analyze. It still does not change the TazWorks order.</p></div><p style={{ color: "#5d687b" }}>Search GUID: {searchGuid}{fileNumber ? ` | File #: ${fileNumber}` : ""}</p>{error ? <p style={{ color: "#b42318", fontWeight: 700 }}>Could not pull search result.</p> : null}{payload ? <><section className="card" style={{ padding: 18, marginBottom: 18 }}><p><strong>Search Type:</strong> {payload.type || "Unknown"}</p><p><strong>Status:</strong> {payload.status || "Unknown"}</p><p><strong>Result:</strong> {payload.result || "Unknown"}</p><p><strong>Suggested Analyzer:</strong> {reviewType === "county_search" ? "County Search" : "National Crim"}</p>{imported?.quickReviewId ? <p><strong>Already Imported:</strong> <Link style={{ color: "#167f49", fontWeight: 800 }} href={`/analyze/${imported.quickReviewId}`}>Open Quick Analyze result</Link></p> : <form action="/api/tazworks/search-results/import" method="post" style={{ display: "grid", gap: 12, marginTop: 14 }}><input type="hidden" name="clientGuid" value={clientGuid} /><input type="hidden" name="orderGuid" value={orderGuid} /><input type="hidden" name="searchGuid" value={searchGuid} /><label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontWeight: 700 }}><input type="checkbox" name="confirmReadOnlyImport" value="yes" required />I understand this will save a copy of this TazWorks result into SaffHire and run Quick Analyze. It will not edit or update the TazWorks order.</label><button className="btn-primary" type="submit">Confirm and Analyze in Quick Analyze</button></form>}</section><section className="card" style={{ padding: 18 }}><h2 style={{ marginTop: 0 }}>Raw Result</h2><pre style={{ background: "#f8fafc", borderRadius: 12, maxHeight: 620, overflow: "auto", padding: 16, whiteSpace: "pre-wrap" }}>{JSON.stringify(payload, null, 2)}</pre></section></> : null}</main></>;
}
