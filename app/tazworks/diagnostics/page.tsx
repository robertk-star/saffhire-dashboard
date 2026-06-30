import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";
import { getTazworksStatus } from "@/lib/tazworks";

function previewUrl(value?: string) {
  const raw = String(value || "").replace(/\/$/, "");
  if (!raw) return "Not set";
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return raw.slice(0, 80);
  }
}

async function checkProxyHealth() {
  const base = String(process.env.TAZWORKS_PROXY_BASE_URL || "").replace(/\/$/, "");
  if (!base) return { ok: false, status: null as number | null, message: "Proxy base URL is not set.", body: null as any };
  try {
    const response = await fetch(`${base}/health`, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
    const text = await response.text();
    let body: any = text;
    try { body = text ? JSON.parse(text) : null; } catch {}
    return { ok: response.ok, status: response.status, message: response.ok ? "Proxy health check passed." : "Proxy health check failed.", body };
  } catch (error: any) {
    return { ok: false, status: null as number | null, message: String(error?.message || error), body: null as any };
  }
}

export default async function TazworksDiagnosticsPage() {
  const user = await requireUser(["admin", "supervisor"]);
  const status = getTazworksStatus();
  const health = await checkProxyHealth();
  const proxyBaseUrl = String(process.env.TAZWORKS_PROXY_BASE_URL || "");
  return <><AppHeader user={user} /><main className="container-shell"><Link href="/tazworks" style={{ color: "#0f3b5f", fontWeight: 800 }}>← Back to TazWorks</Link><h1>TazWorks Diagnostics</h1><p style={{ color: "#5d687b" }}>Safe diagnostics for the read-only TazWorks connection. No order data is changed.</p><section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16, marginBottom: 22 }}><div className="card" style={{ padding: 18 }}><strong>Route</strong><p>{status.proxyMode ? "Fixed-IP proxy" : "Direct from Vercel"}</p></div><div className="card" style={{ padding: 18 }}><strong>Mode</strong><p>{status.sandboxMode ? "Sandbox" : "Live"}</p></div><div className="card" style={{ padding: 18 }}><strong>Proxy Base URL</strong><p>{previewUrl(proxyBaseUrl)}</p></div><div className="card" style={{ padding: 18 }}><strong>Proxy Secret</strong><p>{status.proxySecretSet ? "Set" : "Missing"}</p></div><div className="card" style={{ padding: 18 }}><strong>Default Client GUID</strong><p>{status.defaultClientGuidSet ? "Set" : "Not set"}</p></div></section><section className="card" style={{ padding: 22, marginBottom: 22 }}><h2 style={{ marginTop: 0 }}>Proxy Health</h2><p><strong>Status:</strong> {health.ok ? "Passed" : "Failed"}</p><p><strong>HTTP:</strong> {health.status || "No response"}</p><p><strong>Message:</strong> {health.message}</p>{health.body ? <pre style={{ background: "#f8fafc", borderRadius: 12, maxHeight: 320, overflow: "auto", padding: 14, whiteSpace: "pre-wrap" }}>{JSON.stringify(health.body, null, 2)}</pre> : null}</section><section className="card" style={{ padding: 22 }}><h2 style={{ marginTop: 0 }}>Production Safety Checklist</h2><ul style={{ lineHeight: 1.8 }}><li>Use HTTPS proxy URL before long-term live use.</li><li>Keep TazWorks calls read-only.</li><li>Use Search by file number for live orders.</li><li>Confirm before saving a search result into Quick Analyze.</li><li>Do not expose the proxy secret in browser code or screenshots.</li></ul></section></main></>;
}
