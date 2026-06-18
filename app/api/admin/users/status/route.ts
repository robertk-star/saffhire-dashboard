import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { setDashboardUserActive } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser(["admin"]);
  const formData = await request.formData();
  const id = String(formData.get("id") || "");
  const isActive = String(formData.get("isActive") || "false") === "true";
  if (!id || id.startsWith("env-")) return NextResponse.redirect(new URL("/admin/users?error=status", request.url), 303);
  try {
    await setDashboardUserActive(id, isActive);
    await writeAuditLog({ user, action: isActive ? "dashboard_user_activated" : "dashboard_user_deactivated", entityType: "dashboard_user", entityId: id });
    return NextResponse.redirect(new URL("/admin/users?updated=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin/users?error=status", request.url), 303);
  }
}
