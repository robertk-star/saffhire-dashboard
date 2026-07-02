import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";

export default async function CurrentOrdersPage() {
  const user = await requireUser(["admin", "supervisor"]);
  return <><AppHeader user={user} /><main className="container-shell"><h1>Current Taz Orders</h1><section className="card" style={{ padding: 18 }}><p>Current orders page is being added.</p></section></main></>;
}
