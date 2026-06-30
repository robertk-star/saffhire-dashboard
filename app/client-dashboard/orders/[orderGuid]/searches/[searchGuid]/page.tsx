import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getTazworksAllowedClientGuids, resolveTazworksClientGuid } from "@/lib/tazworksAccess";
import { getTazworksSearchResult } from "@/lib/tazworks";

function safeError(raw: string) {
  if (raw.includes("TAZWORKS_CLIENT_ACCESS_DENIED")) return "Result access could not be verified.";
  if (raw.includes("fetch failed")) return "The result connection is currently unavailable.";
  return raw ? "Result could not be loaded." : "";
}

export default async function ClientDashboardSearchResultPage({ params, searchParams }: { params: Promise<{ orderGuid: string; searchGuid: string }>; searchParams: Promise<{ fileNumber?: string }> }) {
  await requireUser(["admin", "supervisor", "reviewer"]);
  const { orderGuid, searchGuid } = await params;
  const query = await searchParams;
  const clientGuid = resolveTazworksClientGuid(getTazworksAllowedClientGuids()[0] || "");
  const fileNumber = String(query.fileNumber || "");
  let payload: any = null;
  let error = "";
  try { payload = await getTazworksSearchResult(clientGuid, orderGuid, searchGuid); } catch (err: any) { error = err?.message || "result_failed"; }
  const message = safeError(error);
  return <main className="container-shell"><Link href={`/client-dashboard/orders/${orderGuid}?fileNumber=${encodeURIComponent(fileNumber)}`} style={{ color: "#0f3b5f", fontWeight: 800 }}>← Back to Searches</Link><h1>Search Result</h1><p style={{ color: "#5d687b" }}>Read-only result view. This page does not update TazWorks.</p>{message ? <div className="card" style={{ borderColor: "#fda29b", background: "#fff5f5", color: "#b42318", fontWeight: 700, marginBottom: 18, padding: 16 }}>{message}</div> : null}{payload ? <><section className="card" style={{ padding: 18, marginBottom: 18 }}><p><strong>Search Type:</strong> {payload.type || "Unknown"}</p><p><strong>Status:</strong> {payload.status || "Unknown"}</p><p><strong>Result:</strong> {payload.result || "Unknown"}</p>{fileNumber ? <p><strong>File #:</strong> {fileNumber}</p> : null}</section><section className="card" style={{ padding: 18 }}><h2 style={{ marginTop: 0 }}>Raw Result</h2><pre style={{ background: "#f8fafc", borderRadius: 12, maxHeight: 620, overflow: "auto", padding: 16, whiteSpace: "pre-wrap" }}>{JSON.stringify(payload, null, 2)}</pre></section></> : null}</main>;
}
