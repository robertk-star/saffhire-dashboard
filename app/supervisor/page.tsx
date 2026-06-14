import { AppHeader } from "@/components/AppHeader";
import { CaseTable } from "@/components/CaseTable";
import { listCases } from "@/lib/cases";
import { requireUser } from "@/lib/session";

export default async function SupervisorPage() {
  const user = await requireUser(["admin", "supervisor"]);
  const cases = await listCases("needs_supervisor_review");
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>Supervisor Review Queue</h1><p style={{ color: "#5d687b" }}>Cases routed by reviewer decision or AI review.</p><CaseTable cases={cases} /></main></>;
}
