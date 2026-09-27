/**
 * Attach an existing workspace (and its product data) to an owner account.
 *
 * Usage:
 *   npx tsx scripts/seed-owner-account.ts
 *   npx tsx scripts/seed-owner-account.ts --username nakuljain20 --password nakul123 --workspace-slug knowlex
 *
 * Requires DATABASE_URL (Supabase) or uses local SQLite when unset.
 */
import { eq, or } from "drizzle-orm";
import { db } from "../src/db";
import { blueprints, memberships, products, users, workspaces } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth/password";
import { LEGAL_INDIA_BLUEPRINT } from "../src/lib/blueprint/legal-india.fixture";
import { normalizeUsername } from "../src/lib/auth/session";

function arg(name: string, fallback: string) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] ?? fallback : fallback;
}

async function main() {
  const username = normalizeUsername(arg("username", "nakuljain20"));
  const password = arg("password", "nakul123");
  const workspaceSlug = arg("workspace-slug", "knowlex");

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(or(eq(workspaces.slug, workspaceSlug), eq(workspaces.slug, workspaceSlug)))
    .limit(1);

  if (!workspace) {
    throw new Error(
      `Workspace with slug "${workspaceSlug}" not found. Run: npm run db:migrate:knowlex`,
    );
  }

  let [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        username,
        name: username,
        passwordHash: hashPassword(password),
      })
      .returning();
    console.log(`Created user ${username} (id ${user.id})`);
  } else {
    await db
      .update(users)
      .set({ passwordHash: hashPassword(password) })
      .where(eq(users.id, user.id));
    console.log(`Updated password for existing user ${username} (id ${user.id})`);
  }

  await db
    .update(workspaces)
    .set({ ownerUserId: user.id, name: workspace.name || "Knowlex" })
    .where(eq(workspaces.id, workspace.id));

  const existingMembership = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, user.id));

  const hasTarget = existingMembership.some((m) => m.workspaceId === workspace.id);
  if (!hasTarget) {
    await db.insert(memberships).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
    });
    console.log(`Linked user to workspace ${workspace.id} (${workspace.slug})`);
  }

  for (const membership of existingMembership) {
    if (membership.workspaceId !== workspace.id) {
      await db.delete(memberships).where(eq(memberships.id, membership.id));
      console.log(`Removed membership on workspace ${membership.workspaceId}`);
    }
  }

  const productRows = await db.select().from(products);
  for (const product of productRows) {
    if (product.workspaceId !== workspace.id) {
      await db
        .update(products)
        .set({ workspaceId: workspace.id })
        .where(eq(products.id, product.id));
    }
  }

  const [existingBlueprint] = await db
    .select()
    .from(blueprints)
    .where(eq(blueprints.workspaceId, workspace.id))
    .limit(1);

  if (!existingBlueprint) {
    await db.insert(blueprints).values({
      workspaceId: workspace.id,
      version: LEGAL_INDIA_BLUEPRINT.version,
      status: "published",
      blueprintJson: JSON.stringify(LEGAL_INDIA_BLUEPRINT),
    });
    console.log("Seeded legal-india blueprint");
  }

  console.log(
    `\nDone. Sign in with username "${username}" and your password, then open /dashboard.`,
  );
  console.log(`Workspace ${workspace.id} has ${productRows.length} product(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
