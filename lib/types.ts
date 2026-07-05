export type UserRole = "admin" | "reviewer" | "supervisor" | "analyzer";
export type SessionUser = { email: string; name: string; role: UserRole };
