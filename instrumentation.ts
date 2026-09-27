export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.USE_LOCAL_SQLITE?.trim() === "true") return;

  const { ensurePostgresAuthSchema } = await import("@/db/ensure-postgres-auth-schema");
  await ensurePostgresAuthSchema();
}
