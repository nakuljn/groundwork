import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";

export async function getActiveProduct() {
  const [product] = await db
    .select()
    .from(products)
    .orderBy(desc(products.createdAt))
    .limit(1);
  return product ?? null;
}

export async function requireProduct() {
  const product = await getActiveProduct();
  if (!product) {
    throw new Error("No product configured. Go to Settings first.");
  }
  return product;
}
