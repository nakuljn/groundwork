import { eq } from "drizzle-orm";
import { db } from "@/db";
import { blueprints } from "@/db/schema";
import type { Blueprint } from "@/lib/blueprint/schema";
import { getWorkspaceBlueprint, parseBlueprint } from "@/lib/blueprint/service";

type MemoryEntry = {
  key: string;
  value: unknown;
  updatedAt: Date;
};

const memory = new Map<string, MemoryEntry>();

function namespaceKey(workspaceId: number, key: string) {
  return `${workspaceId}:${key}`;
}

/** LangGraph Store-compatible memory backed by in-process map + published blueprint in DB. */
export async function getStoreValue<T>(workspaceId: number, key: string): Promise<T | null> {
  const hit = memory.get(namespaceKey(workspaceId, key));
  if (hit) return hit.value as T;

  if (key === "published_blueprint") {
    const blueprint = await getWorkspaceBlueprint(workspaceId);
    return blueprint as T;
  }

  return null;
}

export async function putStoreValue(workspaceId: number, key: string, value: unknown) {
  memory.set(namespaceKey(workspaceId, key), { key, value, updatedAt: new Date() });
}

export async function getProductFacts(workspaceId: number): Promise<string | null> {
  return getStoreValue<string>(workspaceId, "product_facts");
}

export async function saveProductFacts(workspaceId: number, facts: string) {
  await putStoreValue(workspaceId, "product_facts", facts);
}

export async function getPublishedBlueprint(workspaceId: number): Promise<Blueprint> {
  const [row] = await db
    .select()
    .from(blueprints)
    .where(eq(blueprints.workspaceId, workspaceId))
    .orderBy(blueprints.version)
    .limit(1);
  if (!row) return getWorkspaceBlueprint(workspaceId);
  return parseBlueprint(JSON.parse(row.blueprintJson));
}
