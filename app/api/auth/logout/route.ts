import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const user = await getCurrentUser();
  await writeAuditLog({ user, action: "logout", entityType: "auth" });
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
