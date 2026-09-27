import fs from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contentWeeks, marketingPosts, marketingSettings, products } from "@/db/schema";
import { generateImagePng } from "@/lib/ai";

if (typeof window !== "undefined") {
  throw new Error("@/lib/marketing-images cannot be imported in client code");
}

export const MARKETING_IMAGE_DIR = path.join(process.cwd(), "data", "marketing-images");

function safeName(value: string) {
  return path.basename(value).replace(/[^a-zA-Z0-9._-]/g, "");
}

async function contextForPost(postId: number) {
  const [post] = await db.select().from(marketingPosts).where(eq(marketingPosts.id, postId));
  if (!post) throw new Error("Post not found");
  const [week] = await db.select().from(contentWeeks).where(eq(contentWeeks.id, post.contentWeekId));
  if (!week) throw new Error("Content week not found");
  const [[product], [settings]] = await Promise.all([
    db.select().from(products).where(eq(products.id, week.productId)),
    db.select().from(marketingSettings).where(eq(marketingSettings.productId, week.productId)),
  ]);
  if (!product) throw new Error("Product not found");
  return { post, product, settings };
}

export async function generateMarketingPostImage(postId: number, customPrompt?: string) {
  const { post, product, settings } = await contextForPost(postId);
  const concept = customPrompt?.trim() || post.imagePrompt?.trim();
  if (!concept) throw new Error("Add an image prompt first");

  const prompt = `Create a square photorealistic photograph for a LinkedIn Page post.

Brand/product: ${product.name}
Post idea: ${post.plainText.slice(0, 1200)}
Visual concept: ${concept}
Brand style guidance: ${settings?.imageStyle?.trim() || "Documentary-style photography, natural light, realistic textures, credible and professional — not illustrated or templated."}

Requirements:
- photorealistic photograph (NOT illustration, sketch, diagram, flat vector, or template mockup)
- 1:1 square composition, shot like editorial/documentary photography
- natural lighting, real materials and environments, believable depth of field
- no words, letters, captions, watermarks, logos, UI screenshots, or readable text
- no gavels, scales of justice, handshakes, or generic office stock-photo scenes
- one clear focal subject, generous negative space, designed for a professional LinkedIn feed`;

  const bytes = await generateImagePng(prompt);
  await fs.mkdir(MARKETING_IMAGE_DIR, { recursive: true });
  const filename = safeName(`post-${postId}-${Date.now()}.png`);
  await fs.writeFile(path.join(MARKETING_IMAGE_DIR, filename), bytes);

  if (post.imagePath) {
    await fs.rm(path.join(MARKETING_IMAGE_DIR, safeName(post.imagePath)), { force: true });
  }

  await db
    .update(marketingPosts)
    .set({
      imagePrompt: concept,
      imagePath: filename,
      updatedAt: new Date(),
    })
    .where(eq(marketingPosts.id, postId));
  return filename;
}

export async function removeMarketingPostImage(postId: number) {
  const [post] = await db.select().from(marketingPosts).where(eq(marketingPosts.id, postId));
  if (!post) throw new Error("Post not found");
  if (post.imagePath) {
    await fs.rm(path.join(MARKETING_IMAGE_DIR, safeName(post.imagePath)), { force: true });
  }
  await db
    .update(marketingPosts)
    .set({ imagePath: null, updatedAt: new Date() })
    .where(eq(marketingPosts.id, postId));
}

export async function readMarketingImage(filename: string) {
  const safe = safeName(filename);
  if (!safe || safe !== filename) throw new Error("Invalid image path");
  return fs.readFile(path.join(MARKETING_IMAGE_DIR, safe));
}
