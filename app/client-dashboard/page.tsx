import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getTazworksAccessStatus } from "@/lib/tazworksAccess";

export default async function ClientDashboardPage() {
  await requireUser(["admin", "supervisor", "reviewer"]);
  const access = getTazworksAccessStatus();
  return <main className="container-shell"><h1>Client Order Dashboard</h1><p style={{ color: "#5d687b" }}>Read-only access to order information. This area does not create, edit, submit, cancel, or update TazWorks orders.</p><section className="card" style={{ padding: 22, marginBottom: 18 }}><h2 style={{ marginTop: 0 }}>Access</h2><p>{access.lockedMode ? `Locked to ${access.allowedClientCount} allowed client GUID${access.allowedClientCount === 1 ? "" : "s"}.` : "Not locked yet. Add client dashboard ENV values before using this for a client."}</p></section><section className="card" style={{ padding: 22 }}><h2 style={{ marginTop: 0 }}>Orders</h2><p style={{ color: "#5d687b" }}>Search by file number or pull a small recent order list.</p><Link className="btn-primary" href="/client-dashboard/orders">Open Orders</Link></section></main>;
}
