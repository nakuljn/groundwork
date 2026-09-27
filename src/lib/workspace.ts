import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, workspaces } from "@/db/schema";
import { getActiveWorkspaceBlueprint, ensureDefaultWorkspace } from "@/lib/blueprint/service";
import type { Blueprint } from "@/lib/blueprint/schema";
import { getSessionUser, getUserWorkspace } from "@/lib/auth/session";

export type WorkspaceContext = {
  workspaceId: number;
  workspace: typeof workspaces.$inferSelect;
  blueprint: Blueprint;
  product: typeof products.$inferSelect | null;
};

async function resolveWorkspace() {
  const session = await getSessionUser();
  if (session) {
    const userWorkspace = await getUserWorkspace(session.user.id);
    if (userWorkspace) return userWorkspace;
  }
  return ensureDefaultWorkspace();
}

export async function getWorkspaceContext(): Promise<WorkspaceContext> {
  const workspace = await resolveWorkspace();
  const blueprint = await getActiveWorkspaceBlueprint(workspace.id).then((r) => r.blueprint);

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.workspaceId, workspace.id))
    .orderBy(desc(products.createdAt))
    .limit(1);

  if (!product) {
    const [fallback] = await db.select().from(products).orderBy(desc(products.createdAt)).limit(1);
    if (fallback && !fallback.workspaceId) {
      await db.update(products).set({ workspaceId: workspace.id }).where(eq(products.id, fallback.id));
      return {
        workspaceId: workspace.id,
        workspace,
        blueprint,
        product: { ...fallback, workspaceId: workspace.id },
      };
    }
    return { workspaceId: workspace.id, workspace, blueprint, product: fallback ?? null };
  }

  return { workspaceId: workspace.id, workspace, blueprint, product };
}

export async function requireWorkspaceProduct() {
  const ctx = await getWorkspaceContext();
  if (!ctx.product) {
    throw new Error("No product configured. Go to Settings first.");
  }
  return ctx;
}

/** @deprecated use requireWorkspaceProduct().product */
export async function requireProduct() {
  const ctx = await requireWorkspaceProduct();
  return ctx.product;
}

/** @deprecated use getWorkspaceContext().product */
export async function getActiveProduct() {
  const ctx = await getWorkspaceContext();
  return ctx.product;
}
