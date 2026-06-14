export type UserRole = "admin" | "reviewer" | "supervisor";
export type SessionUser = { email: string; name: string; role: UserRole };
