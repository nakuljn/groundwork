import { eq } from "drizzle-orm";
import { db } from "@/db";
import { outreachCategories, type OutreachCategory } from "@/db/schema";
import { MESSAGE_GROUPS } from "@/lib/categories";

if (typeof window !== "undefined") {
  throw new Error("@/lib/categories-server cannot be imported in client code");
}

const orderOf = (key: string) => {
  const i = MESSAGE_GROUPS.findIndex((g) => g.key === key);
  return i === -1 ? MESSAGE_GROUPS.length : i;
};

function load(productId: number) {
  return db
    .select()
    .from(outreachCategories)
    .where(eq(outreachCategories.productId, productId));
}

export async function ensureCategories(productId: number): Promise<OutreachCategory[]> {
  let existing = await load(productId);

  // Firms used to share one template set, written for partners.
  const legacyFirm = existing.find((c) => c.key === "firm");
  if (legacyFirm && !existing.some((c) => c.key === "firm_partner")) {
    await db
      .update(outreachCategories)
      .set({ key: "firm_partner" })
      .where(eq(outreachCategories.id, legacyFirm.id));
    existing = await load(productId);
  }

  const byKey = new Map(existing.map((c) => [c.key, c]));
  let changed = false;
  for (const group of MESSAGE_GROUPS) {
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
    .filter((c) => MESSAGE_GROUPS.some((g) => g.key === c.key))
    .sort((a, b) => orderOf(a.key) - orderOf(b.key));
}

export async function getCategories(productId: number) {
  return ensureCategories(productId);
}
