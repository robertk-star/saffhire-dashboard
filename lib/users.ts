import type { UserRole, SessionUser } from "@/lib/types";

type AppUser = SessionUser & { loginCode: string };

function cleanEmail(value: string): string { return value.trim().toLowerCase(); }

function parseStaffList(): AppUser[] {
  const raw = process.env.APP_USERS_JSON;
  if (!raw) return [];
  try {
    const rows = JSON.parse(raw) as Array<Record<string, string>>;
    return rows.filter((row) => row.email && row.loginCode && row.role).map((row) => ({
      email: cleanEmail(row.email),
      loginCode: row.loginCode,
      name: row.name || row.email,
      role: row.role as UserRole,
    }));
  } catch { return []; }
}

export function getConfiguredUsers(): AppUser[] {
  const users = parseStaffList();
  const adminEmail = process.env.APP_ADMIN_EMAIL;
  const adminCode = process.env.APP_ADMIN_CODE;
  if (adminEmail && adminCode) users.unshift({ email: cleanEmail(adminEmail), loginCode: adminCode, name: "SaffHire Admin", role: "admin" });
  return users;
}

export function findUser(email: string, loginCode: string): SessionUser | null {
  const found = getConfiguredUsers().find((user) => user.email === cleanEmail(email) && user.loginCode === loginCode);
  return found ? { email: found.email, name: found.name, role: found.role } : null;
}

export function listSafeUsers(): SessionUser[] {
  return getConfiguredUsers().map(({ email, name, role }) => ({ email, name, role }));
}
