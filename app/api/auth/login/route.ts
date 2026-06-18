import { NextResponse } from "next/server";
import { findUser } from "@/lib/users";
import { setSessionCookie } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "");
  const loginCode = String(formData.get("loginCode") || "");
  const user = await findUser(email, loginCode);
  if (!user) { await writeAuditLog({ user: null, action: "login_failed", entityType: "auth" }); return NextResponse.redirect(new URL("/login?error=1", request.url), 303); }
  await setSessionCookie(user);
  await writeAuditLog({ user, action: "login_success", entityType: "auth" });
  return NextResponse.redirect(new URL("/dashboard", request.url), 303);
}
