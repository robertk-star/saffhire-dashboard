import Link from "next/link";
import type { SessionUser } from "@/lib/types";

export function AppHeader({ user }: { user: SessionUser }) {
  const navItems = [["Dashboard", "/dashboard"], ["Cases", "/cases"], ["Documents", "/documents"], ["Supervisor", "/supervisor"], ["Audit Logs", "/admin/audit-logs"], ["Settings", "/settings"]];
  return (
    <div style={{ background: "#0f3b5f", color: "white" }}>
      <div style={{ alignItems: "center", display: "flex", gap: 18, justifyContent: "space-between", margin: "0 auto", maxWidth: 1180, padding: "16px 20px" }}>
        <Link href="/dashboard" style={{ fontSize: 20, fontWeight: 800 }}>SaffHire Dashboard</Link>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{navItems.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
        <form action="/api/auth/logout" method="post" style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ fontSize: 13 }}>{user.email}</span><button className="btn-secondary" type="submit">Log out</button></form>
      </div>
    </div>
  );
}
