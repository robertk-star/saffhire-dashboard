import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { getTazworksApplicantFromOrder, getTazworksOrder, getTazworksSearchResult, getTazworksStatus, reviewTypeFromTazworksPayload } from "@/lib/tazworks";
import { requireUser } from "@/lib/session";

function clientLabel(name?: string, code?: string) {
  if (name && code) return `${name} (${code})`;
  return name || code || "Client not named";
}

function analyzerName(reviewType: string) {
  return reviewType === "county_search" ? "County Criminal Analysis" : "National Criminal Analysis";
}

function importErrorMessage(code?: string, detail?: string) {
  if (!code) return "";
  if (code === "quick_save") return "The analyzer ran, but the result could not be saved to Quick Analyze.";
  if (code === "import_failed") return `The analyzer could not complete this TazWorks result.${detail ? ` Detail: ${detail}` : ""}`;
  if (code === "confirm_required") return "The result was not sent because the import confirmation was missing.";
  if (code === "result_pull_failed") return "Could not pull the search result from TazWorks.";
  return `TazWorks result action failed: ${code}${detail ? ` Detail: ${detail}` : ""}`;
}

function isNationalAlias(payload: any) {
  const type = String(payload?.type || "").toUpperCase();
  const name = String(payload?.displayName || "").toUpperCase();
  return type.includes("NATIONAL_CRIMINAL_DATABASE_ALIAS") || (name.includes("NATIONAL") && name.includes("ALIAS"));
}

function isCountyCriminal(payload: any) {
  const type = String(payload?.type || "").toUpperCase();
  const name = String(payload?.displayName || "").toUpperCase();
  return type.includes("COUNTY_CRIMINAL") || (name.includes("COUNTY") && name.includes("CRIM"));
}

function applicantNameFromRecord(applicant: any) {
  return [applicant?.firstName, applicant?.middleName, applicant?.lastName, applicant?.generation].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function AnalysisForm({ reviewType, clientGuid, clientName, clientCode, orderGuid, searchGuid, fileNumber }: { reviewType: "national_crim" | "county_search"; clientGuid: string; clientName: string; clientCode: string; orderGuid: string; searchGuid: string; fileNumber: string }) {
  return <form action="/api/tazworks/search-results/import" method="post" style={{ display: "grid", gap: 10 }}><input type="hidden" name="clientGuid" value={clientGuid} /><input type="hidden" name="clientName" value={clientName} /><input type="hidden" name="clientCode" value={clientCode} /><input type="hidden" name="orderGuid" value={orderGuid} /><input type="hidden" name="searchGuid" value={searchGuid} /><input type="hidden" name="fileNumber" value={fileNumber} /><input type="hidden" name="reviewType" value={reviewType} /><input type="hidden" name="confirmReadOnlyImport" value="yes" /><button className={reviewType === "county_search" ? "btn-secondary" : "btn-primary"} type="submit">Send to {analyzerName(reviewType)}</button></form>;
}

function ManualAnalysisForm({ mode, clientGuid, clientName, clientCode, orderGuid, searchGuid, fileNumber, personName, dob, defaultVendorText }: { mode: "national" | "county"; clientGuid: string; clientName: string; clientCode: string; orderGuid: string; searchGuid: string; fileNumber: string; personName: string; dob: string; defaultVendorText: string }) {
  const isCounty = mode === "county";
  return <section className="card" style={{ padding: 22, marginBottom: 18 }}><h2 style={{ marginTop: 0 }}>{isCounty ? "County Criminal Search Analysis" : "National Database Analysis"}</h2><p style={{ color: "#5d687b" }}>{isCounty ? "Paste the county vendor record details here. AI will use FCRA-aware county record rules to decide whether each county record should be reported or not." : "Paste the vendor data here until TazWorks support confirms where the full National Alias address and alias output is exposed through the API."}</p><form action="/api/analyze/quick" method="post" style={{ display: "grid", gap: 14 }}><input type="hidden" name="review_type" value={isCounty ? "county_search" : "national_crim"} /><input type="hidden" name="client_name" value={clientName} /><input type="hidden" name="client_code" value={clientCode} /><input type="hidden" name="order_guid" value={orderGuid} /><input type="hidden" name="search_guid" value={searchGuid} /><input type="hidden" name="reference_number" value={searchGuid} /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}><label><strong>File Number</strong><input name="file_number" defaultValue={fileNumber} style={{ width: "100%" }} /></label><label><strong>Name</strong><input name="person_name" defaultValue={personName} required style={{ width: "100%" }} /></label><label><strong>DOB</strong><input name="dob" defaultValue={dob} style={{ width: "100%" }} /></label></div><label><strong>Alias Information</strong><textarea name="aliases_text" placeholder="Paste aliases/name variations from the vendor here." style={{ minHeight: 110, width: "100%" }} /></label><label><strong>Address Information</strong><textarea name="address_text" placeholder="Paste address history/geography from the vendor here." style={{ minHeight: 140, width: "100%" }} /></label><label><strong>{isCounty ? "County Vendor Records" : "Vendor Records"}</strong><textarea name="pasted_text" defaultValue={defaultVendorText} required placeholder={isCounty ? "Paste the county criminal records from the vendor here. Include case number, court, county/state, charge, offense date, disposition, disposition date, sentence, and status when available." : "Paste the records from the vendor here. This is the main record data AI will compare against the name, DOB, aliases, and address history above."} style={{ minHeight: 320, width: "100%" }} /></label><button className="btn-primary" type="submit">Analyze</button></form></section>;
}

export default async function TazworksSearchResultPage({ params, searchParams }: { params: Promise<{ orderGuid: string; searchGuid: string }>; searchParams: Promise<{ clientGuid?: string; clientName?: string; clientCode?: string; fileNumber?: string; error?: string; detail?: string }> }) {
  const user = await requireUser(["admin", "supervisor", "analyzer"]);
  const { orderGuid, searchGuid } = await params;
  const query = await searchParams;
  const status = getTazworksStatus();
  const clientGuid = query.clientGuid || "";
  const clientName = query.clientName || "";
  const clientCode = query.clientCode || "";
  const fileNumber = query.fileNumber || "";
  let payload: any = null;
  let order: any = null;
  let applicant: any = null;
  let error = query.error || "";
  if (clientGuid && orderGuid && searchGuid) {
    try { payload = await getTazworksSearchResult(clientGuid, orderGuid, searchGuid); } catch (err: any) { error = err?.message || "result_pull_failed"; }
    try { order = await getTazworksOrder(clientGuid, orderGuid); } catch {}
    try { applicant = await getTazworksApplicantFromOrder(clientGuid, orderGuid); } catch {}
  }
  const suggestedReviewType = payload ? reviewTypeFromTazworksPayload(payload) : "national_crim";
  const errorMessage = importErrorMessage(error, query.detail);
  const nationalAlias = payload ? isNationalAlias(payload) : false;
  const countyCriminal = payload ? isCountyCriminal(payload) : false;
  const manualMode = nationalAlias ? "national" : countyCriminal ? "county" : "";
  const effectiveFileNumber = String(order?.fileNumber || fileNumber || "");
  const effectiveName = String(order?.applicantName || applicantNameFromRecord(applicant) || payload?.displayValue || "");
  const effectiveDob = String(order?.applicantDateOfBirth || applicant?.dateOfBirth || "");
  const defaultVendorText = payload?.results ? JSON.stringify(payload, null, 2) : "";
  const pageTitle = nationalAlias ? "National Database Analysis" : countyCriminal ? "County Criminal Search Analysis" : "TazWorks Search Result";
  return <><AppHeader user={user} /><main className="container-shell"><Link href={`/tazworks/orders/${orderGuid}?clientGuid=${encodeURIComponent(clientGuid)}&clientName=${encodeURIComponent(clientName)}&clientCode=${encodeURIComponent(clientCode)}&fileNumber=${encodeURIComponent(fileNumber)}`} style={{ color: "#0f3b5f", fontWeight: 800 }}>← Back to Searches</Link><h1>{pageTitle}</h1><div className="card" style={{ background: status.sandboxMode ? "#f8fafc" : "#fff7ed", borderColor: status.sandboxMode ? "#cbd5e1" : "#fdba74", padding: 16, marginBottom: 18 }}><strong>{status.sandboxMode ? "Sandbox Mode" : "Live TazWorks Mode"}</strong><p style={{ marginBottom: 0 }}>{manualMode ? "This page lets you paste vendor details and run Quick Analyze without changing the TazWorks order." : "Viewing this page only pulls data from TazWorks. Sending the result to an analyzer saves a copy to SaffHire and runs Quick Analyze. It does not change the TazWorks order."}</p></div><p style={{ color: "#5d687b" }}>Client: {clientLabel(clientName, clientCode)} | Order GUID: {orderGuid} | Search GUID: {searchGuid}{effectiveFileNumber ? ` | File #: ${effectiveFileNumber}` : ""}</p>{errorMessage ? <div className="card" style={{ borderColor: "#fda29b", background: "#fff5f5", color: "#b42318", fontWeight: 700, marginBottom: 18, padding: 16 }}>{errorMessage}</div> : null}{payload && manualMode ? <ManualAnalysisForm mode={manualMode as "national" | "county"} clientGuid={clientGuid} clientName={clientName} clientCode={clientCode} orderGuid={orderGuid} searchGuid={searchGuid} fileNumber={effectiveFileNumber} personName={effectiveName} dob={effectiveDob} defaultVendorText={defaultVendorText} /> : null}{payload && !manualMode ? <><section className="card" style={{ padding: 18, marginBottom: 18 }}><p><strong>Search Type:</strong> {payload.type || "Unknown"}</p><p><strong>Status:</strong> {payload.status || "Unknown"}</p><p><strong>Result:</strong> {payload.result || "Unknown"}</p><p><strong>Suggested Analyzer:</strong> {analyzerName(suggestedReviewType)}</p><div style={{ borderTop: "1px solid #d7dee8", display: "grid", gap: 12, marginTop: 16, paddingTop: 16 }}><h2 style={{ margin: 0 }}>Send Result to Analysis</h2><p style={{ color: "#5d687b", margin: 0 }}>Choose the analyzer. National Criminal and County Criminal reviews use different decision trees.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}><AnalysisForm reviewType="national_crim" clientGuid={clientGuid} clientName={clientName} clientCode={clientCode} orderGuid={orderGuid} searchGuid={searchGuid} fileNumber={effectiveFileNumber} /><AnalysisForm reviewType="county_search" clientGuid={clientGuid} clientName={clientName} clientCode={clientCode} orderGuid={orderGuid} searchGuid={searchGuid} fileNumber={effectiveFileNumber} /></div></div></section><section className="card" style={{ padding: 18 }}><h2 style={{ marginTop: 0 }}>Raw Result</h2><pre style={{ background: "#f8fafc", borderRadius: 12, maxHeight: 620, overflow: "auto", padding: 16, whiteSpace: "pre-wrap" }}>{JSON.stringify(payload, null, 2)}</pre></section></> : null}</main></>;
}
