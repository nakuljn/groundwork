import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agentRuns } from "@/db/schema";

/** Persists onboarding graph checkpoints via agent_runs.output_json. */
export async function saveCheckpoint(threadId: string, state: unknown) {
  await db
    .update(agentRuns)
    .set({ outputJson: JSON.stringify({ checkpoint: state }) })
    .where(eq(agentRuns.threadId, threadId));
}

export async function loadCheckpoint<T>(threadId: string): Promise<T | null> {
  const [row] = await db.select().from(agentRuns).where(eq(agentRuns.threadId, threadId)).limit(1);
  if (!row?.outputJson) return null;
  try {
    const parsed = JSON.parse(row.outputJson) as { checkpoint?: T };
    return parsed.checkpoint ?? null;
  } catch {
    return null;
  }
}
