export function SetupNotice() {
  return (
    <div className="card" style={{ borderColor: "#f3c846", marginBottom: 20, padding: 18 }}>
      <h2 style={{ margin: "0 0 8px" }}>Database setup needed</h2>
      <p style={{ color: "#5d687b", lineHeight: 1.5, margin: 0 }}>
        The Phase 1A SQL migration and Vercel environment variables must be set before case saving and audit logs work.
      </p>
    </div>
  );
}
