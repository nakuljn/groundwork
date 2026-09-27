import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { blueprints, workspaces } from "@/db/schema";
import { LEGAL_INDIA_BLUEPRINT } from "./legal-india.fixture";
import { blueprintSchema, type Blueprint } from "./schema";

if (typeof window !== "undefined") {
  throw new Error("@/lib/blueprint/service cannot be imported in client code");
}

export function parseBlueprint(raw: unknown): Blueprint {
  return blueprintSchema.parse(raw);
}

export function defaultBlueprint(): Blueprint {
  return LEGAL_INDIA_BLUEPRINT;
}

export async function ensureDefaultWorkspace() {
  const [existing] = await db.select().from(workspaces).limit(1);
  if (existing) return existing;

  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: "Default workspace",
      slug: "default",
    })
    .returning();

  await db.insert(blueprints).values({
    workspaceId: workspace.id,
    version: LEGAL_INDIA_BLUEPRINT.version,
    status: "published",
    blueprintJson: JSON.stringify(LEGAL_INDIA_BLUEPRINT),
  });

  return workspace;
}

export async function getWorkspaceBlueprint(workspaceId: number): Promise<Blueprint> {
  const [row] = await db
    .select()
    .from(blueprints)
    .where(eq(blueprints.workspaceId, workspaceId))
    .orderBy(desc(blueprints.version))
    .limit(1);

  if (!row) return defaultBlueprint();
  try {
    return parseBlueprint(JSON.parse(row.blueprintJson));
  } catch {
    return defaultBlueprint();
  }
}

export async function getActiveWorkspaceBlueprint(workspaceId?: number): Promise<{
  workspaceId: number;
  blueprint: Blueprint;
}> {
  const workspace = workspaceId
    ? (await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1))[0] ??
      (await ensureDefaultWorkspace())
    : await ensureDefaultWorkspace();
  const blueprint = await getWorkspaceBlueprint(workspace.id);
  return { workspaceId: workspace.id, blueprint };
}

export async function publishBlueprint(workspaceId: number, draft: Blueprint) {
  const parsed = parseBlueprint(draft);
  const [latest] = await db
    .select()
    .from(blueprints)
    .where(eq(blueprints.workspaceId, workspaceId))
    .orderBy(desc(blueprints.version))
    .limit(1);

  const version = (latest?.version ?? 0) + 1;
  const [row] = await db
    .insert(blueprints)
    .values({
      workspaceId,
      version,
      status: "published",
      blueprintJson: JSON.stringify({ ...parsed, version }),
    })
    .returning();

  return row;
}

export async function saveDraftBlueprint(workspaceId: number, draft: Blueprint, runId?: number) {
  const parsed = parseBlueprint(draft);
  const [row] = await db
    .insert(blueprints)
    .values({
      workspaceId,
      version: parsed.version,
      status: "draft",
      blueprintJson: JSON.stringify(parsed),
      agentRunId: runId ?? null,
    })
    .returning();
  return row;
}
