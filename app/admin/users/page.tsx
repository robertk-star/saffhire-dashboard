import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";
import { listSafeUsers } from "@/lib/users";

export default async function AdminUsersPage() {
  const user = await requireUser(["admin"]);
  const users = listSafeUsers();
  return (
    <>
      <AppHeader user={user} />
      <main className="container-shell">
        <h1 style={{ marginTop: 0 }}>Staff Users</h1>
        <p style={{ color: "#5d687b" }}>Phase 1A users are managed with Vercel environment variables.</p>
        <div className="card table-wrap">
          <table><thead><tr><th>Email</th><th>Name</th><th>Role</th></tr></thead><tbody>{users.map((item) => <tr key={item.email}><td>{item.email}</td><td>{item.name}</td><td>{item.role}</td></tr>)}</tbody></table>
        </div>
      </main>
    </>
  );
}
