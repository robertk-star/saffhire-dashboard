import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { createDashboardUser } from "@/lib/users";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser(["admin"]);
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "reviewer") as UserRole;
  const accessCode = String(formData.get("accessCode") || "");
  if (!email || !name || !accessCode || !["admin", "reviewer", "supervisor"].includes(role)) return NextResponse.redirect(new URL("/admin/users?error=missing", request.url), 303);
  try {
    const row = await createDashboardUser({ email, name, role, accessCode, actorEmail: user.email });
    await writeAuditLog({ user, action: "dashboard_user_created", entityType: "dashboard_user", entityId: row.id, metadata: { email, role } });
    return NextResponse.redirect(new URL("/admin/users?created=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin/users?error=create", request.url), 303);
  }
}
