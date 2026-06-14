import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { getTazworksStatus } from "@/lib/tazworks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser(["admin", "supervisor"]);
  const status = getTazworksStatus();
  await writeAuditLog({ user, action: "tazworks_settings_tested", entityType: "tazworks", metadata: status });
  if (!status.configured) return NextResponse.redirect(new URL("/tazworks?error=missing_settings", request.url), 303);
  return NextResponse.redirect(new URL("/tazworks?connected=1", request.url), 303);
}
