import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole, SessionUser } from "@/lib/types";

const COOKIE_NAME = "saffhire_dashboard_session";
const MAX_AGE_SECONDS = 60 * 60 * 10;

type SessionPayload = SessionUser & { iat: number };

function getSecret(): string { return process.env.APP_SESSION_SECRET || "dev-only-change-this-value"; }
function sign(payload: string): string { return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url"); }

export function createSessionToken(user: SessionUser): string {
  const encodedPayload = Buffer.from(JSON.stringify({ ...user, iat: Date.now() })).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function parseSessionToken(token?: string): SessionUser | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || sign(encodedPayload) !== signature) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (Date.now() - parsed.iat > MAX_AGE_SECONDS * 1000) return null;
    return { email: parsed.email, name: parsed.name, role: parsed.role };
  } catch { return null; }
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionToken(user), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: MAX_AGE_SECONDS, path: "/" });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 0, path: "/" });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  return parseSessionToken(cookieStore.get(COOKIE_NAME)?.value);
}

export async function requireUser(allowedRoles?: UserRole[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(user.role)) redirect("/dashboard");
  return user;
}
