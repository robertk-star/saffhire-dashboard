import Link from "next/link";
import type { SessionUser } from "@/lib/types";

const menuButtonStyle = {
  cursor: "pointer",
  fontWeight: 800,
  listStyle: "none",
  padding: "6px 8px",
} as const;

const menuPanelStyle = {
  background: "white",
  border: "1px solid #d7dee8",
  borderRadius: 12,
  boxShadow: "0 12px 30px rgba(15, 59, 95, 0.18)",
  color: "#0f172a",
  display: "grid",
  gap: 8,
  marginTop: 8,
  minWidth: 190,
  padding: 12,
  position: "absolute",
  right: 0,
  zIndex: 20,
} as const;

function HeaderMenu({ label, items }: { label: string; items: Array<[string, string]> }) {
  return <details style={{ position: "relative" }}><summary style={menuButtonStyle}>{label} ▾</summary><div style={menuPanelStyle}>{items.map(([itemLabel, href]) => <Link key={href} href={href} style={{ color: "#0f3b5f", fontWeight: 800 }}>{itemLabel}</Link>)}</div></details>;
}

export function AppHeader({ user }: { user: SessionUser }) {
  const analyzerHome = "/tazworks/current-orders";
  if (user.role === "analyzer") {
    return <div style={{ background: "#0f3b5f", color: "white" }}><div style={{ alignItems: "center", display: "flex", gap: 18, justifyContent: "space-between", margin: "0 auto", maxWidth: 1180, padding: "16px 20px" }}><Link href={analyzerHome} style={{ fontSize: 20, fontWeight: 800 }}>SaffHire Analyzer</Link><nav style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10 }}><Link href={analyzerHome} style={{ fontWeight: 800 }}>Current Orders</Link></nav><form action="/api/auth/logout" method="post" style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ fontSize: 13 }}>{user.email}</span><button className="btn-secondary" type="submit">Log out</button></form></div></div>;
  }
  const reviewItems: Array<[string, string]> = [["Quick Analyze", "/analyze"], ["Cases", "/cases"], ["Documents", "/documents"], ["Supervisor", "/supervisor"]];
  const tazOrderItems: Array<[string, string]> = [["Taz Orders Home", "/tazworks"], ["Pull Orders", "/tazworks/orders"], ["Current Orders", "/tazworks/current-orders"], ["Manage Clients", "/tazworks/clients"], ["Diagnostics", "/tazworks/diagnostics"], ["Field Mapping", "/tazworks/mapping"], ["Import Sample JSON", "/tazworks/import"]];
  const adminItems: Array<[string, string]> = [["Users", "/admin/users"], ["Audit Logs", "/admin/audit-logs"], ["Settings", "/settings"]];
  return (
    <div style={{ background: "#0f3b5f", color: "white" }}>
      <div style={{ alignItems: "center", display: "flex", gap: 18, justifyContent: "space-between", margin: "0 auto", maxWidth: 1180, padding: "16px 20px" }}>
        <Link href="/dashboard" style={{ fontSize: 20, fontWeight: 800 }}>SaffHire Dashboard</Link>
        <nav style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10 }}><Link href="/dashboard" style={{ fontWeight: 800 }}>Dashboard</Link><HeaderMenu label="Review" items={reviewItems} /><HeaderMenu label="Taz Orders" items={tazOrderItems} /><HeaderMenu label="Admin" items={adminItems} /></nav>
        <form action="/api/auth/logout" method="post" style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ fontSize: 13 }}>{user.email}</span><button className="btn-secondary" type="submit">Log out</button></form>
      </div>
    </div>
  );
}
