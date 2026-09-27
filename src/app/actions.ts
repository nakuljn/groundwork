"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  products,
  contacts,
  activities,
  researchRuns,
} from "@/db/schema";
import { runProspectResearch, parseRun } from "@/lib/prospect-research";
import {
  parseAndLogActivity,
  generateProductBrief,
  generateCategoryMessages as generateCategoryMessagesLib,
  refineCategoryMessages as refineCategoryMessagesLib,
  regenerateCategoryTemplate as regenerateCategoryTemplateLib,
  saveCategoryTemplate as saveCategoryTemplateLib,
  applyTargetFirmName as applyTargetFirmNameLib,
} from "@/lib/writing";
import { deleteTrack, finishStep, setTrackStatus, startTrack } from "@/lib/tracks";
import { isDuplicateProspect } from "@/lib/dedup";
import { applyTemplate, inferCategoryKey, messageGroupKey, orgContactCategory } from "@/lib/categories";
import { getActiveWorkspaceBlueprint } from "@/lib/blueprint/service";
import { templateFor, type MessageKind, type TemplateKind } from "@/lib/outreach";
import { ensureCategories } from "@/lib/categories-server";
import { collectProductContext } from "@/lib/product-reader";
import { getActiveProduct } from "@/lib/product";
import {
  createManualMarketingPost,
  dismissMarketingReminder,
  generateMarketingWeek,
  regenerateMarketingPost,
  saveMarketingPost,
  setMarketingPostStatus,
  updateMarketingSettings,
  updateMarketingCadence,
} from "@/lib/marketing";
import {
  generateMarketingPostImage,
  removeMarketingPostImage,
} from "@/lib/marketing-images";

export async function saveProduct(formData: FormData) {
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    oneLiner: String(formData.get("oneLiner") ?? "").trim() || null,
    audience: String(formData.get("audience") ?? "").trim() || null,
    offer: String(formData.get("offer") ?? "").trim() || null,
    goal: String(formData.get("goal") ?? "").trim() || null,
    websiteUrl: String(formData.get("websiteUrl") ?? "").trim() || null,
    repoPath: String(formData.get("repoPath") ?? "").trim() || null,
    brief: String(formData.get("brief") ?? "").trim() || null,
  };

  if (!payload.name) {
    throw new Error("Product name is required");
  }

  const existing = await getActiveProduct();
  if (existing) {
    await db.update(products).set(payload).where(eq(products.id, existing.id));
  } else {
    await db.insert(products).values(payload);
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings");
}

export async function saveSenderProfile(formData: FormData) {
  const product = await getActiveProduct();
  if (!product) throw new Error("Save your product first");

  await db
    .update(products)
    .set({
      senderName: String(formData.get("senderName") ?? "").trim() || null,
      senderTitle: String(formData.get("senderTitle") ?? "").trim() || null,
      senderContact: String(formData.get("senderContact") ?? "").trim() || null,
    })
    .where(eq(products.id, product.id));

  revalidatePath("/settings");
  revalidatePath("/list");
  revalidatePath("/plan");
  revalidatePath("/", "layout");
}

export async function understandProduct() {
  const product = await getActiveProduct();
  if (!product) throw new Error("Save product details first");

  const rawContext = await collectProductContext({
    repoPath: product.repoPath,
    websiteUrl: product.websiteUrl,
  });

  if (rawContext.includes("Path not found")) {
    throw new Error(
      `Repo path not found: ${product.repoPath}. Use the full absolute path to your product folder.`,
    );
  }

  const brief = await generateProductBrief(product.id, rawContext);
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return brief;
}

export async function submitProgressUpdate(formData: FormData) {
  const product = await getActiveProduct();
  if (!product) throw new Error("Configure a product in Settings first");

  const text = String(formData.get("text") ?? "").trim();
  if (!text) throw new Error("Write what you did");

  const logged = await parseAndLogActivity(product.id, text);
  revalidatePath("/activity");
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return logged;
}

export async function startTrackAction(key: string) {
  const product = await getActiveProduct();
  if (!product) throw new Error("Configure a product in Settings first");
  await startTrack(product.id, key);
  revalidatePath("/", "layout");
}

export async function finishStepAction(stepId: number, outcome: "done" | "skipped") {
  const result = await finishStep(stepId, outcome);
  revalidatePath("/", "layout");
  return result;
}

export async function setTrackStatusAction(trackId: number, status: "active" | "paused") {
  await setTrackStatus(trackId, status);
  revalidatePath("/", "layout");
}

export async function deleteTrackAction(trackId: number) {
  await deleteTrack(trackId);
  revalidatePath("/", "layout");
}

export async function addActivity(formData: FormData) {
  const product = await getActiveProduct();
  if (!product) throw new Error("Configure a product in Settings first");

  const dateStr = String(formData.get("date") ?? "");

  await db.insert(activities).values({
    productId: product.id,
    type: String(formData.get("type") ?? "other"),
    channel: String(formData.get("channel") ?? "other"),
    count: Math.max(1, Number(formData.get("count") ?? 1) || 1),
    note: String(formData.get("note") ?? "").trim() || null,
    outcome: String(formData.get("outcome") ?? "").trim() || null,
    costInr: Math.max(0, Math.round(Number(formData.get("costInr") ?? 0) || 0)),
    createdAt: dateStr ? new Date(dateStr) : new Date(),
  });

  revalidatePath("/activity");
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function importContacts(formData: FormData) {
  const product = await getActiveProduct();
  if (!product) throw new Error("Configure a product in Settings first");

  const raw = String(formData.get("contacts") ?? "").trim();
  const sourceChannel = String(formData.get("sourceChannel") ?? "linkedin");
  const category = String(formData.get("category") ?? "advocate");

  if (!raw) throw new Error("Paste at least one contact");

  const lines = raw.split("\n").filter((l) => l.trim());
  let imported = 0;

  for (const line of lines) {
    const parts = line.split("\t").length > 1 ? line.split("\t") : line.split(",");
    const [name, role, org, city, profileUrl, email, notes] = parts.map((p) =>
      p?.trim(),
    );

    if (!name) continue;

    await db.insert(contacts).values({
      productId: product.id,
      name,
      role: role || null,
      org: org || null,
      city: city || null,
      profileUrl: profileUrl || null,
      email: email || null,
      notes: notes || null,
      sourceChannel,
      category: category === "firm" ? "firm" : "advocate",
    });
    imported++;
  }

  revalidatePath("/plan");
  revalidatePath("/list");
  revalidatePath("/", "layout");
  return imported;
}

export async function updateContactStatus(contactId: number, status: string) {
  await db.update(contacts).set({ status }).where(eq(contacts.id, contactId));
  revalidatePath("/plan");
  revalidatePath("/list");
  revalidatePath("/", "layout");
}

export async function updateContactCategory(contactId: number, category: string) {
  await db
    .update(contacts)
    .set({ category: category === "firm" ? "firm" : "advocate" })
    .where(eq(contacts.id, contactId));
  revalidatePath("/plan");
  revalidatePath("/list");
  revalidatePath("/", "layout");
}

export async function generateCategoryMessages(categoryId: number) {
  const result = await generateCategoryMessagesLib(categoryId);
  revalidatePath("/plan");
  revalidatePath("/list");
  return result;
}

export async function refineCategoryMessages(
  categoryId: number,
  instructions: string,
  kind: MessageKind = "all",
) {
  const result = await refineCategoryMessagesLib(categoryId, instructions, kind);
  revalidatePath("/plan");
  revalidatePath("/list");
  return result;
}

export async function regenerateCategoryTemplate(
  categoryId: number,
  kind: TemplateKind,
  instructions?: string,
) {
  const result = await regenerateCategoryTemplateLib(categoryId, kind, instructions);
  revalidatePath("/plan");
  revalidatePath("/list");
  return result;
}

export async function saveCategoryTemplate(categoryId: number, kind: TemplateKind, text: string) {
  await saveCategoryTemplateLib(categoryId, kind, text);
  revalidatePath("/plan");
  revalidatePath("/list");
}

export async function applyTargetFirmNameAction(
  productId: number,
  newFirm: string,
  previousFirm?: string,
) {
  const result = await applyTargetFirmNameLib(productId, newFirm, previousFirm);
  revalidatePath("/plan");
  revalidatePath("/list");
  return result;
}

export async function markContactSent(contactId: number, kind: TemplateKind) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId));

  if (!contact) throw new Error("Contact not found");

  const { blueprint } = await getActiveWorkspaceBlueprint();
  const cats = await ensureCategories(contact.productId, blueprint);
  const cat = cats.find((c) => c.key === messageGroupKey(blueprint, contact)) ?? cats[0];

  if (!cat) throw new Error("No message category found");

  const spec = templateFor(kind);
  const template = cat[spec.field];

  if (!template) throw new Error(`Draft ${cat.name} messages first`);

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, contact.productId));

  const note = applyTemplate(template, contact, {
    link: product?.websiteUrl,
    orgPlaceholder: blueprint.vocabulary.orgPlaceholder,
  });

  await db.insert(activities).values({
    productId: contact.productId,
    contactId,
    type: spec.channel === "email" ? "cold_email" : "linkedin_outreach",
    channel: spec.channel,
    count: 1,
    note: `${spec.label}: ${note}`,
  });

  const nextStatus =
    contact.status === "new" || contact.status === "contacted"
      ? "contacted"
      : contact.status;

  await db
    .update(contacts)
    .set({ status: nextStatus, lastContactedAt: new Date() })
    .where(eq(contacts.id, contactId));

  revalidatePath("/plan");
  revalidatePath("/activity");
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function deleteActivity(activityId: number) {
  await db.delete(activities).where(eq(activities.id, activityId));
  revalidatePath("/activity");
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function runProspectAgent(opts?: {
  target?: string;
  location?: string;
  count?: number;
}) {
  const product = await getActiveProduct();
  if (!product) throw new Error("Configure a product in Settings first");

  const target =
    opts?.target?.trim() ||
    product.audience?.trim() ||
    product.oneLiner?.trim() ||
    product.name;
  const count = Math.min(Math.max(opts?.count ?? 20, 1), 25);

  const run = await runProspectResearch({
    productId: product.id,
    target,
    location: opts?.location?.trim() ?? "",
    count,
  });

  revalidatePath("/plan");
  revalidatePath("/list");
  revalidatePath("/", "layout");

  const prospects = JSON.parse(run.results) as import("@/lib/prospect-research").Prospect[];
  const existing = await db
    .select()
    .from(contacts)
    .where(eq(contacts.productId, product.id));

  const newCount = prospects.filter((p) => !isDuplicateProspect(p, existing)).length;

  return {
    prospectCount: prospects.length,
    newCount,
    duplicateCount: prospects.length - newCount,
    error: run.error,
  };
}

export async function findProspects(formData: FormData) {
  return runProspectAgent({
    target: String(formData.get("target") ?? ""),
    location: String(formData.get("location") ?? ""),
    count: Number(formData.get("count") ?? 10),
  });
}

export async function importSheetForDedup(raw: string, category = "advocate") {
  const product = await getActiveProduct();
  if (!product) throw new Error("Configure a product in Settings first");

  const catKey = category === "firm" ? "firm" : "advocate";

  const lines = raw.split("\n").filter((l) => l.trim());
  let imported = 0;
  let skipped = 0;

  const existing = await db
    .select()
    .from(contacts)
    .where(eq(contacts.productId, product.id));

  for (const line of lines) {
    const parts = line.split("\t").length > 1 ? line.split("\t") : line.split(",");
    const [name, role, org, city, profileUrl, email] = parts.map((p) => p?.trim());
    if (!name) continue;

    const prospectLike = {
      firmName: org || name,
      personName: org ? name : "",
      role: role || "",
      type: "",
      sizeEstimate: "",
      city: city || "",
      website: "",
      email: email || "",
      phone: "",
      linkedinUrl: profileUrl || "",
      whyFit: "",
      sourceUrl: "",
    };

    if (isDuplicateProspect(prospectLike, existing)) {
      skipped++;
      continue;
    }

    const [row] = await db
      .insert(contacts)
      .values({
        productId: product.id,
        name,
        role: role || null,
        org: org || null,
        city: city || null,
        profileUrl: profileUrl || null,
        email: email || null,
        sourceChannel: profileUrl?.includes("linkedin") ? "linkedin" : email ? "email" : "other",
        category: catKey,
        notes: "Imported from sheet",
      })
      .returning();

    existing.push(row);
    imported++;
  }

  revalidatePath("/plan");
  revalidatePath("/list");
  revalidatePath("/", "layout");
  return { imported, skipped };
}

export async function saveAllNewProspects(runId: number) {
  const [run] = await db
    .select()
    .from(researchRuns)
    .where(eq(researchRuns.id, runId));
  if (!run) throw new Error("Research run not found");

  const { prospects, added } = parseRun(run);
  const existing = await db
    .select()
    .from(contacts)
    .where(eq(contacts.productId, run.productId));

  const indexes = prospects
    .map((p, i) => i)
    .filter(
      (i) => !added.includes(i) && !isDuplicateProspect(prospects[i], existing),
    );

  return addProspectsToPeople(runId, indexes);
}

export async function addProspectsToPeople(runId: number, indexes: number[]) {
  const [run] = await db
    .select()
    .from(researchRuns)
    .where(eq(researchRuns.id, runId));
  if (!run) throw new Error("Research run not found");

  const { prospects, added } = parseRun(run);
  const existing = await db
    .select()
    .from(contacts)
    .where(eq(contacts.productId, run.productId));

  const toAdd = indexes.filter((i) => prospects[i] && !added.includes(i));
  const saved: number[] = [];

  for (const i of toAdd) {
    const p = prospects[i];
    if (isDuplicateProspect(p, existing)) continue;

    const [row] = await db
      .insert(contacts)
      .values({
        productId: run.productId,
        name: p.personName || p.firmName,
        role: p.role || null,
        org: p.personName ? p.firmName || null : null,
        city: p.city || null,
        profileUrl: p.linkedinUrl || p.website || null,
        email: p.email || null,
        notes:
          [p.type, p.sizeEstimate, p.phone && `Phone: ${p.phone}`, p.whyFit, p.sourceUrl && `Source: ${p.sourceUrl}`]
            .filter(Boolean)
            .join(" · ") || null,
        sourceChannel: p.linkedinUrl ? "linkedin" : p.email ? "email" : "other",
        category: inferCategoryKey(
          (await getActiveWorkspaceBlueprint()).blueprint,
          p,
        ),
      })
      .returning();

    existing.push(row);
    saved.push(i);
  }

  await db
    .update(researchRuns)
    .set({ added: JSON.stringify([...added, ...saved]) })
    .where(eq(researchRuns.id, runId));

  revalidatePath("/plan");
  revalidatePath("/list");
  revalidatePath("/", "layout");
  return saved.length;
}

export async function generateMarketingWeekAction(topic?: string, weekStart?: string) {
  const product = await getActiveProduct();
  if (!product) throw new Error("Configure a product in Settings first");
  const start = weekStart ? new Date(`${weekStart}T00:00:00`) : undefined;
  await generateMarketingWeek(product.id, topic, start);
  revalidatePath("/marketing");
  revalidatePath("/");
}

export async function updateMarketingCadenceAction(values: {
  weeklyTarget: number;
  postingDays: number[];
  postTime: string;
}) {
  const product = await getActiveProduct();
  if (!product) throw new Error("Configure a product in Settings first");
  await updateMarketingCadence(product.id, values);
  revalidatePath("/marketing");
  revalidatePath("/");
}

export async function createManualMarketingPostAction(contentWeekId: number) {
  const post = await createManualMarketingPost(contentWeekId);
  revalidatePath("/marketing");
  return post.id;
}

export async function saveMarketingPostAction(
  postId: number,
  input: {
    title: string;
    plainText: string;
    formattedText: string;
    imagePrompt?: string;
    hook?: string;
  },
) {
  await saveMarketingPost(postId, input);
  revalidatePath("/marketing");
  revalidatePath("/");
}

export async function regenerateMarketingPostAction(
  postId: number,
  instructions?: string,
) {
  await regenerateMarketingPost(postId, instructions);
  revalidatePath("/marketing");
}

export async function setMarketingPostStatusAction(
  postId: number,
  status: "draft" | "ready" | "posted" | "skipped",
) {
  await setMarketingPostStatus(postId, status);
  revalidatePath("/marketing");
  revalidatePath("/activity");
  revalidatePath("/");
}

export async function saveMarketingSettingsAction(formData: FormData) {
  const product = await getActiveProduct();
  if (!product) throw new Error("Configure a product in Settings first");
  await updateMarketingSettings(product.id, {
    reminderEnabled: formData.get("reminderEnabled") === "on",
    reminderDay: Math.min(7, Math.max(1, Number(formData.get("reminderDay") ?? 1))),
    timezone: String(formData.get("timezone") ?? "Asia/Kolkata").trim() || "Asia/Kolkata",
    voiceGuidance: String(formData.get("voiceGuidance") ?? "").trim() || null,
    imageStyle: String(formData.get("imageStyle") ?? "").trim() || null,
    pastPosts: String(formData.get("pastPosts") ?? "").trim() || null,
  });
  revalidatePath("/settings");
  revalidatePath("/marketing");
  revalidatePath("/");
}

export async function dismissMarketingReminderAction() {
  const product = await getActiveProduct();
  if (!product) return;
  await dismissMarketingReminder(product.id);
  revalidatePath("/");
}

export async function generateMarketingImageAction(postId: number, prompt?: string) {
  const filename = await generateMarketingPostImage(postId, prompt);
  revalidatePath("/marketing");
  return filename;
}

export async function removeMarketingImageAction(postId: number) {
  await removeMarketingPostImage(postId);
  revalidatePath("/marketing");
}
