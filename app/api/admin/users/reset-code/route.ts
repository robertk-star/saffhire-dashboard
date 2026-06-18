import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { getDashboardUserById, resetDashboardUserAccessCode } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser(["admin"]);
  const formData = await request.formData();
  const id = String(formData.get("id") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const accessCode = String(formData.get("accessCode") || "");
  if (!id || id.startsWith("env-") || !email || accessCode.length < 6) return NextResponse.redirect(new URL("/admin/users?error=reset", request.url), 303);
  try {
    const target = await getDashboardUserById(id);
    if (!target || target.email !== email) return NextResponse.redirect(new URL("/admin/users?error=reset", request.url), 303);
    await resetDashboardUserAccessCode(id, email, accessCode);
    await writeAuditLog({ user, action: "dashboard_user_access_code_reset", entityType: "dashboard_user", entityId: id, metadata: { email } });
    return NextResponse.redirect(new URL("/admin/users?reset=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin/users?error=reset", request.url), 303);
  }
}
