import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { getDashboardUserById, updateDashboardUserRole } from "@/lib/users";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser(["admin"]);
  const formData = await request.formData();
  const id = String(formData.get("id") || "");
  const role = String(formData.get("role") || "reviewer") as UserRole;
  if (!id || id.startsWith("env-") || !["admin", "reviewer", "supervisor", "analyzer"].includes(role)) return NextResponse.redirect(new URL("/admin/users?error=role", request.url), 303);
  try {
    const target = await getDashboardUserById(id);
    if (!target) return NextResponse.redirect(new URL("/admin/users?error=role", request.url), 303);
    await updateDashboardUserRole(id, role);
    await writeAuditLog({ user, action: "dashboard_user_role_updated", entityType: "dashboard_user", entityId: id, metadata: { email: target.email, from: target.role, to: role } });
    return NextResponse.redirect(new URL("/admin/users?role=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin/users?error=role", request.url), 303);
  }
}
