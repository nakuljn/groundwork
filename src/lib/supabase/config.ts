/** Extract project ref from https://<ref>.supabase.co */
export function getSupabaseProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const ref = host.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
}

/**
 * Postgres URL for Drizzle. Prefer DATABASE_URL (copy from Supabase → Database → Connection string).
 * Or set SUPABASE_DB_PASSWORD and we build: postgresql://postgres:***@db.<ref>.supabase.co:5432/postgres
 */
export function getDatabaseUrl(): string | null {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) return direct;

  const ref = getSupabaseProjectRef();
  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (!ref || !password) return null;

  return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
}

export function isProductionDatabaseEnabled() {
  return Boolean(getDatabaseUrl());
}
