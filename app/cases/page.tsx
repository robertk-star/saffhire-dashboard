import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CaseTable } from "@/components/CaseTable";
import { listCases } from "@/lib/cases";
import { requireUser } from "@/lib/session";

export default async function CasesPage() {
  const user = await requireUser();
  const cases = await listCases();
  return <><AppHeader user={user} /><main className="container-shell"><div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 20 }}><div><h1 style={{ margin: 0 }}>Cases</h1><p style={{ color: "#5d687b" }}>Internal review case list.</p></div><Link className="btn-primary" href="/cases/new">Start New Review</Link></div><CaseTable cases={cases} /></main></>;
}
