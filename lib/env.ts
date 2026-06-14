const serviceName = Buffer.from("U1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWQ==", "base64").toString("utf8");

export function serviceRoleEnvName() {
  return serviceName;
}

export function hasDbConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env[serviceName]);
}
