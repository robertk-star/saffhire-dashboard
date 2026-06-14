import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;

  return (
    <main style={{ display: "grid", minHeight: "100vh", placeItems: "center", padding: 24 }}>
      <section className="card" style={{ maxWidth: 440, padding: 28, width: "100%" }}>
        <h1 style={{ margin: "0 0 8px" }}>SaffHire Dashboard</h1>
        <p style={{ color: "#5d687b", lineHeight: 1.5, marginTop: 0 }}>Private staff access for internal case review.</p>
        {params.error ? <p style={{ color: "#b42318", fontWeight: 700 }}>Login was not accepted. Check the email and access code.</p> : null}
        <form action="/api/auth/login" method="post" style={{ display: "grid", gap: 16 }}>
          <label>
            <span className="field-label">Email</span>
            <input className="field-input" name="email" type="email" required />
          </label>
          <label>
            <span className="field-label">Access code</span>
            <input className="field-input" name="loginCode" type="text" required />
          </label>
          <button className="btn-primary" type="submit">Log in</button>
        </form>
      </section>
    </main>
  );
}
