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

function supabaseRegion() {
  return process.env.SUPABASE_REGION?.trim() || "ap-south-1";
}

/**
 * Postgres URL for Drizzle.
 * Prefer DATABASE_URL (use Supabase pooler URI from Dashboard → Database → Connection string → Transaction pooler).
 * Or set SUPABASE_DB_PASSWORD and we build the pooler URL automatically.
 */
export function getDatabaseUrl(): string | null {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) return direct;

  const ref = getSupabaseProjectRef();
  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (!ref || !password) return null;

  const region = supabaseRegion();
  const user = `postgres.${ref}`;
  return `postgresql://${user}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
}

export function isProductionDatabaseEnabled() {
  return Boolean(getDatabaseUrl());
}
