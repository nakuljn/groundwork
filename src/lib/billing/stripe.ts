import Stripe from "stripe";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function recordUsageEvent(input: {
  workspaceId: number;
  kind: string;
  units?: number;
  meta?: Record<string, unknown>;
}) {
  const { db } = await import("@/db");
  const { usageEvents } = await import("@/db/schema");
  await db.insert(usageEvents).values({
    workspaceId: input.workspaceId,
    kind: input.kind,
    units: input.units ?? 1,
    metaJson: input.meta ? JSON.stringify(input.meta) : null,
  });
}
