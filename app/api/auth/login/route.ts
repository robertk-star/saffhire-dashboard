import { NextResponse } from "next/server";
import { findUser } from "@/lib/users";
import { setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "");
  const loginCode = String(formData.get("loginCode") || "");
  const user = findUser(email, loginCode);
  if (!user) return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  await setSessionCookie(user);
  return NextResponse.redirect(new URL("/dashboard", request.url), 303);
}
