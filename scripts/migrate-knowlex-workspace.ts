/**
 * Links existing SQLite product data to the default workspace and seeds the legal-india blueprint.
 * Run: npx tsx scripts/migrate-knowlex-workspace.ts
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { blueprints, products, workspaces } from "../src/db/schema";
import { LEGAL_INDIA_BLUEPRINT } from "../src/lib/blueprint/legal-india.fixture";
import { ensureDefaultWorkspace } from "../src/lib/blueprint/service";

async function main() {
  const workspace = await ensureDefaultWorkspace();
  await db.update(workspaces).set({ name: "Knowlex", slug: "knowlex" }).where(eq(workspaces.id, workspace.id));

  const rows = await db.select().from(products);
  for (const product of rows) {
    if (!product.workspaceId) {
      await db.update(products).set({ workspaceId: workspace.id }).where(eq(products.id, product.id));
    }
  }

  const [existingBlueprint] = await db
    .select()
    .from(blueprints)
    .where(eq(blueprints.workspaceId, workspace.id));

  if (!existingBlueprint) {
    await db.insert(blueprints).values({
      workspaceId: workspace.id,
      version: LEGAL_INDIA_BLUEPRINT.version,
      status: "published",
      blueprintJson: JSON.stringify(LEGAL_INDIA_BLUEPRINT),
    });
  }

  console.log(`Migrated ${rows.length} product(s) to workspace ${workspace.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
