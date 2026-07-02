import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { getTazworksSearchResult, getTazworksStatus, reviewTypeFromTazworksPayload } from "@/lib/tazworks";
import { requireUser } from "@/lib/session";

function clientLabel(name?: string, code?: string) {
  if (name && code) return `${name} (${code})`;
  return name || code || "Client not named";
}

function analyzerName(reviewType: string) {
  return reviewType === "county_search" ? "County Criminal Analysis" : "National Criminal Analysis";
}

function AnalysisForm({ reviewType, clientGuid, clientName, clientCode, orderGuid, searchGuid, fileNumber }: { reviewType: "national_crim" | "county_search"; clientGuid: string; clientName: string; clientCode: string; orderGuid: string; searchGuid: string; fileNumber: string }) {
  return <form action="/api/tazworks/search-results/import" method="post" style={{ display: "grid", gap: 10 }}><input type="hidden" name="clientGuid" value={clientGuid} /><input type="hidden" name="clientName" value={clientName} /><input type="hidden" name="clientCode" value={clientCode} /><input type="hidden" name="orderGuid" value={orderGuid} /><input type="hidden" name="searchGuid" value={searchGuid} /><input type="hidden" name="fileNumber" value={fileNumber} /><input type="hidden" name="reviewType" value={reviewType} /><input type="hidden" name="confirmReadOnlyImport" value="yes" /><button className={reviewType === "county_search" ? "btn-secondary" : "btn-primary"} type="submit">Send to {analyzerName(reviewType)}</button></form>;
}

export default async function TazworksSearchResultPage({ params, searchParams }: { params: Promise<{ orderGuid: string; searchGuid: string }>; searchParams: Promise<{ clientGuid?: string; clientName?: string; clientCode?: string; fileNumber?: string; error?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const { orderGuid, searchGuid } = await params;
  const query = await searchParams;
  const status = getTazworksStatus();
  const clientGuid = query.clientGuid || "";
  const clientName = query.clientName || "";
  const clientCode = query.clientCode || "";
  const fileNumber = query.fileNumber || "";
  let payload: any = null;
  let error = query.error || "";
  if (clientGuid && orderGuid && searchGuid) {
    try { payload = await getTazworksSearchResult(clientGuid, orderGuid, searchGuid); } catch (err: any) { error = err?.message || "result_pull_failed"; }
  }
  const suggestedReviewType = payload ? reviewTypeFromTazworksPayload(payload) : "national_crim";
  return <><AppHeader user={user} /><main className="container-shell"><Link href={`/tazworks/orders/${orderGuid}?clientGuid=${encodeURIComponent(clientGuid)}&clientName=${encodeURIComponent(clientName)}&clientCode=${encodeURIComponent(clientCode)}&fileNumber=${encodeURIComponent(fileNumber)}`} style={{ color: "#0f3b5f", fontWeight: 800 }}>← Back to Searches</Link><h1>TazWorks Search Result</h1><div className="card" style={{ background: status.sandboxMode ? "#f8fafc" : "#fff7ed", borderColor: status.sandboxMode ? "#cbd5e1" : "#fdba74", padding: 16, marginBottom: 18 }}><strong>{status.sandboxMode ? "Sandbox Mode" : "Live TazWorks Mode"}</strong><p style={{ marginBottom: 0 }}>Viewing this page only pulls data from TazWorks. Sending the result to an analyzer saves a copy to SaffHire and runs Quick Analyze. It does not change the TazWorks order.</p></div><p style={{ color: "#5d687b" }}>Client: {clientLabel(clientName, clientCode)} | Order GUID: {orderGuid} | Search GUID: {searchGuid}{fileNumber ? ` | File #: ${fileNumber}` : ""}</p>{error ? <p style={{ color: "#b42318", fontWeight: 700 }}>Could not pull search result.</p> : null}{payload ? <><section className="card" style={{ padding: 18, marginBottom: 18 }}><p><strong>Search Type:</strong> {payload.type || "Unknown"}</p><p><strong>Status:</strong> {payload.status || "Unknown"}</p><p><strong>Result:</strong> {payload.result || "Unknown"}</p><p><strong>Suggested Analyzer:</strong> {analyzerName(suggestedReviewType)}</p><div style={{ borderTop: "1px solid #d7dee8", display: "grid", gap: 12, marginTop: 16, paddingTop: 16 }}><h2 style={{ margin: 0 }}>Send Result to Analysis</h2><p style={{ color: "#5d687b", margin: 0 }}>Choose the analyzer. National Criminal and County Criminal reviews use different decision trees.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}><AnalysisForm reviewType="national_crim" clientGuid={clientGuid} clientName={clientName} clientCode={clientCode} orderGuid={orderGuid} searchGuid={searchGuid} fileNumber={fileNumber} /><AnalysisForm reviewType="county_search" clientGuid={clientGuid} clientName={clientName} clientCode={clientCode} orderGuid={orderGuid} searchGuid={searchGuid} fileNumber={fileNumber} /></div></div></section><section className="card" style={{ padding: 18 }}><h2 style={{ marginTop: 0 }}>Raw Result</h2><pre style={{ background: "#f8fafc", borderRadius: 12, maxHeight: 620, overflow: "auto", padding: 16, whiteSpace: "pre-wrap" }}>{JSON.stringify(payload, null, 2)}</pre></section></> : null}</main></>;
}
