import { eq } from "drizzle-orm";
import { db } from "@/db";
import { outreachCategories, type OutreachCategory } from "@/db/schema";
import type { Blueprint } from "@/lib/blueprint/schema";
import { messageGroupsFromBlueprint } from "@/lib/blueprint/helpers";
import { getActiveWorkspaceBlueprint } from "@/lib/blueprint/service";

if (typeof window !== "undefined") {
  throw new Error("@/lib/categories-server cannot be imported in client code");
}

const orderOf = (blueprint: Blueprint, key: string) => {
  const groups = messageGroupsFromBlueprint(blueprint);
  const i = groups.findIndex((g) => g.key === key);
  return i === -1 ? groups.length : i;
};

function load(productId: number) {
  return db
    .select()
    .from(outreachCategories)
    .where(eq(outreachCategories.productId, productId));
}

export async function ensureCategories(
  productId: number,
  blueprint?: Blueprint,
): Promise<OutreachCategory[]> {
  const bp = blueprint ?? (await getActiveWorkspaceBlueprint()).blueprint;
  const groups = messageGroupsFromBlueprint(bp);

  let existing = await load(productId);

  const legacyFirm = existing.find((c) => c.key === "firm");
  const partnerKey = bp.segments
    .flatMap((s) => s.roles ?? [])
    .find((r) => r.key.includes("partner"))?.key;
  if (legacyFirm && partnerKey && !existing.some((c) => c.key === partnerKey)) {
    await db
      .update(outreachCategories)
      .set({ key: partnerKey })
      .where(eq(outreachCategories.id, legacyFirm.id));
    existing = await load(productId);
  }

  const byKey = new Map(existing.map((c) => [c.key, c]));
  let changed = false;
  for (const group of groups) {
    const row = byKey.get(group.key);
    if (!row) {
      await db.insert(outreachCategories).values({
        productId,
        key: group.key,
        name: group.name,
        description: group.description,
      });
      changed = true;
    } else if (row.name !== group.name || row.description !== group.description) {
      await db
        .update(outreachCategories)
        .set({ name: group.name, description: group.description })
        .where(eq(outreachCategories.id, row.id));
      changed = true;
    }
  }

  const rows = changed ? await load(productId) : existing;
  return rows
    .filter((c) => groups.some((g) => g.key === c.key))
    .sort((a, b) => orderOf(bp, a.key) - orderOf(bp, b.key));
}

export async function getCategories(productId: number, blueprint?: Blueprint) {
  return ensureCategories(productId, blueprint);
}
