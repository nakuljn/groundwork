import { and, asc, desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { z } from "zod";
import { db } from "@/db";
import {
  activities,
  contentWeeks,
  marketingPosts,
  marketingSettings,
  products,
  type Product,
} from "@/db/schema";
import { generate } from "@/lib/ai";
import { FIRM_ROLES } from "@/lib/categories";
import {
  composePostText,
  currentWeekStart,
  formatSlotDate,
  isMarketingReminderDue,
  linkedinBodyRules,
  marketingDraftIssues,
  parsePostingDays,
  planningWeekStart,
  postRoleMeta,
  shouldProtectMarketingPost,
  weekSlots,
  type MarketingWeekDraft,
  type PostRole,
  type WeekSlot,
} from "@/lib/marketing-shared";

export {
  currentWeekStart,
  isMarketingReminderDue,
  marketingDraftIssues,
  shouldProtectMarketingPost,
  defaultPostingDays,
  parsePostingDays,
  weekSlots,
  planningWeekStart,
  nextPostSlot,
  storyArc,
  postRoleMeta,
  formatPostTime,
  formatSlotDate,
  POST_ROLES,
  postImage,
  slotStatus,
} from "@/lib/marketing-shared";

const postSchema = z.object({
  role: z.enum(["problem", "insight", "product", "tip", "build"]),
  title: z.string().max(80).default(""),
  hook: z.string().min(8).max(90),
  body: z.string().min(80).max(2800),
  imagePrompt: z.string().min(20).max(1200),
});

function weekSchema(count: number) {
  return z.object({
    storyline: z.string().min(30).max(500),
    posts: z.array(postSchema).length(count),
  });
}

function productFacts(product: Product) {
  return [
    `Product: ${product.name}`,
    product.oneLiner && `One-liner: ${product.oneLiner}`,
    product.audience && `Audience: ${product.audience}`,
    product.offer && `Offer: ${product.offer}`,
    product.websiteUrl && `Website: ${product.websiteUrl}`,
    product.brief && `Brief:\n${product.brief}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function audienceContext() {
  const firmRoles = FIRM_ROLES.map((r) => `- ${r.name}: ${r.description}`).join("\n");
  return `You write for Indian legal professionals.
- Individual advocates (solo practitioners, small chambers)
- People at law firms, by role:
${firmRoles}`;
}

async function requireProduct(productId: number) {
  const [product] = await db.select().from(products).where(eq(products.id, productId));
  if (!product) throw new Error("Product not found");
  return product;
}

export async function ensureMarketingSettings(productId: number) {
  const [existing] = await db
    .select()
    .from(marketingSettings)
    .where(eq(marketingSettings.productId, productId));
  if (existing) return existing;

  const [created] = await db
    .insert(marketingSettings)
    .values({ productId })
    .returning();
  return created;
}

export async function getOrCreateWeek(productId: number, weekStart: Date) {
  const start = currentWeekStart(weekStart);
  const [existing] = await db
    .select()
    .from(contentWeeks)
    .where(and(eq(contentWeeks.productId, productId), eq(contentWeeks.weekStart, start)));
  if (existing) return existing;

  const [created] = await db
    .insert(contentWeeks)
    .values({ productId, weekStart: start })
    .returning();
  return created;
}

async function postedHistory(productId: number, limit = 8) {
  const rows = await db
    .select({
      hook: marketingPosts.hook,
      plainText: marketingPosts.plainText,
      postedAt: marketingPosts.postedAt,
      title: marketingPosts.title,
    })
    .from(marketingPosts)
    .innerJoin(contentWeeks, eq(marketingPosts.contentWeekId, contentWeeks.id))
    .where(and(eq(contentWeeks.productId, productId), eq(marketingPosts.status, "posted")))
    .orderBy(desc(marketingPosts.postedAt))
    .limit(limit);
  return rows;
}

async function recentTopics(productId: number, limit = 6) {
  const rows = await db
    .select({ topic: contentWeeks.topic, storyline: contentWeeks.storyline })
    .from(contentWeeks)
    .where(eq(contentWeeks.productId, productId))
    .orderBy(desc(contentWeeks.weekStart))
    .limit(limit);
  return rows.filter((r) => r.topic || r.storyline);
}

function roleInstructions(role: PostRole) {
  const map: Record<PostRole, string> = {
    problem: "Tell a relatable story or observation from an Indian legal professional's work. Do not sell.",
    insight: "Teach a practical idea that follows from the problem. Build trust. Do not sell.",
    product: "Connect the idea to the product and end with a soft, specific CTA using only the saved offer/website.",
    tip: "Share one concrete tip the audience can use today. Light product mention at most.",
    build: "Show something real about building the product — a decision, a constraint, a lesson. Honest, not hype.",
    custom: "Write a useful standalone post.",
  };
  return map[role] ?? map.insight;
}

async function writeWeek(
  product: Product,
  slots: WeekSlot[],
  settings: {
    voiceGuidance: string | null;
    imageStyle: string | null;
    pastPosts: string | null;
  },
  history: Awaited<ReturnType<typeof postedHistory>>,
  topics: Awaited<ReturnType<typeof recentTopics>>,
  topic?: string,
): Promise<MarketingWeekDraft> {
  const today = format(new Date(), "EEEE, d MMMM yyyy");
  const slotLines = slots
    .map(
      (s) =>
        `- Post ${s.sequence} (${formatSlotDate(s.date)}, role: ${s.role}): ${roleInstructions(s.role)}`,
    )
    .join("\n");

  const historyBlock =
    history.length > 0
      ? history
          .map(
            (p, i) =>
              `${i + 1}. ${p.hook ?? p.title ?? "Untitled"} — ${(p.plainText ?? "").slice(0, 200)}…`,
          )
          .join("\n")
      : "None logged yet.";

  const topicBlock =
    topics.length > 0
      ? topics.map((t) => `- ${t.topic ?? "(no topic)"}: ${t.storyline ?? ""}`).join("\n")
      : "None yet.";

  const topicLine = topic?.trim()
    ? `Founder-provided topic: ${topic.trim()}`
    : "Choose one timely, useful topic directly supported by the product facts. Do not repeat recent topics.";

  const prompt = `TODAY: ${today}

PRODUCT FACTS:
${productFacts(product)}

AUDIENCE:
${audienceContext()}

${topicLine}
Voice guidance: ${settings.voiceGuidance?.trim() || "Clear, practical, credible, founder-led."}
Image style: ${settings.imageStyle?.trim() || "Editorial, minimal, professional, no stock-photo clichés."}

RECENT POSTS YOU WROTE (match voice, do not repeat hooks or topics):
${historyBlock}

${settings.pastPosts?.trim() ? `PAST POSTS THE FOUNDER PASTED (match tone):\n${settings.pastPosts.trim()}\n` : ""}
RECENT WEEKLY TOPICS (avoid repeating):
${topicBlock}

THIS WEEK'S POSTS (${slots.length} total, connected storyline):
${slotLines}

For each post return:
- hook: one standalone attention line, max 90 characters, concrete and specific. No hashtag, emoji, or question-only line. This becomes the bold first line.
- body: the rest of the post after the hook. Follow the LinkedIn format rules below exactly.
- title: internal label
- imagePrompt: square editorial visual, no text/logos/clichés

${linkedinBodyRules(product.name)}

Return JSON: {"storyline":"one sentence connecting all posts","posts":[{"role":"","title":"","hook":"","body":"","imagePrompt":""}]}`;

  const system =
    "You are the editorial lead for a legal technology founder in India. You write scannable LinkedIn Page posts — short blocks, bullets, inline **bold** markers — using only supplied facts. Return valid JSON.";

  const schema = weekSchema(slots.length);
  const first = await generate({
    system,
    prompt,
    schema,
    task: "writing",
    temperature: 0.65,
  });
  const issues = marketingDraftIssues(first, product.name);
  if (issues.length === 0) return first;

  return generate({
    system,
    prompt: `${prompt}

Your prior draft was rejected:
${issues.map((issue) => `- ${issue}`).join("\n")}

Rewrite all posts and fix every issue.`,
    schema,
    task: "writing",
    temperature: 0.45,
  });
}

export async function getMarketingWorkspace(
  productId: number,
  opts?: { weekStart?: Date; today?: Date },
) {
  const today = opts?.today ?? new Date();
  const settings = await ensureMarketingSettings(productId);
  const postingDays = parsePostingDays(settings.postingDays, settings.weeklyTarget);
  const planStart = opts?.weekStart
    ? currentWeekStart(opts.weekStart)
    : planningWeekStart(today, postingDays, settings.timezone);
  const week = await getOrCreateWeek(productId, planStart);
  const posts = await db
    .select()
    .from(marketingPosts)
    .where(eq(marketingPosts.contentWeekId, week.id))
    .orderBy(asc(marketingPosts.sequence));
  const slots = weekSlots(week.weekStart, postingDays, settings.timezone, today);

  for (const slot of slots) {
    const post = posts.find((p) => p.sequence === slot.sequence);
    if (post && !post.scheduledFor) {
      await db
        .update(marketingPosts)
        .set({ scheduledFor: slot.date, updatedAt: new Date() })
        .where(eq(marketingPosts.id, post.id));
      post.scheduledFor = slot.date;
    }
  }

  return { settings, week: { ...week, posts }, slots, postingDays, today };
}

export async function generateMarketingWeek(productId: number, topic?: string, weekStart?: Date) {
  const [product, settings] = await Promise.all([
    requireProduct(productId),
    ensureMarketingSettings(productId),
  ]);
  if (!product.brief?.trim() && !product.oneLiner?.trim()) {
    throw new Error("Add a product brief or one-liner in Settings first");
  }

  const postingDays = parsePostingDays(settings.postingDays, settings.weeklyTarget);
  const today = new Date();
  const planStart = weekStart ? currentWeekStart(weekStart) : planningWeekStart(today, postingDays, settings.timezone);
  const week = await getOrCreateWeek(productId, planStart);
  const slots = weekSlots(week.weekStart, postingDays, settings.timezone, today);
  const current = await db
    .select()
    .from(marketingPosts)
    .where(eq(marketingPosts.contentWeekId, week.id));

  const emptySlots = slots.filter((slot) => {
    const post = current.find((p) => p.sequence === slot.sequence);
    return !post || !shouldProtectMarketingPost(post);
  });

  if (emptySlots.length === 0) {
    throw new Error("All posts this week are saved, ready, or posted. Mark one as draft to replace it.");
  }

  const [history, topics] = await Promise.all([
    postedHistory(productId),
    recentTopics(productId),
  ]);

  const result = await writeWeek(
    product,
    emptySlots,
    settings,
    history,
    topics,
    topic,
  );

  for (let i = 0; i < emptySlots.length; i++) {
    const slot = emptySlots[i];
    const generated = result.posts[i];
    const composed = composePostText(generated.hook, generated.body);
    const existing = current.find((p) => p.sequence === slot.sequence);
    const values = {
      role: generated.role,
      title: generated.title || postRoleMeta(generated.role, product.name).label,
      hook: composed.hook,
      plainText: composed.plainText,
      formattedText: composed.formattedText,
      imagePrompt: generated.imagePrompt,
      scheduledFor: slot.date,
      status: "draft" as const,
      updatedAt: new Date(),
    };
    if (existing) {
      await db.update(marketingPosts).set(values).where(eq(marketingPosts.id, existing.id));
    } else {
      await db.insert(marketingPosts).values({
        contentWeekId: week.id,
        sequence: slot.sequence,
        ...values,
      });
    }
  }

  await db
    .update(contentWeeks)
    .set({
      topic: topic?.trim() || null,
      storyline: result.storyline,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(contentWeeks.id, week.id));
}

export async function regenerateMarketingPost(postId: number, instructions?: string) {
  const [post] = await db.select().from(marketingPosts).where(eq(marketingPosts.id, postId));
  if (!post) throw new Error("Post not found");
  const [week] = await db.select().from(contentWeeks).where(eq(contentWeeks.id, post.contentWeekId));
  if (!week) throw new Error("Content week not found");
  const [product, settings] = await Promise.all([
    requireProduct(week.productId),
    ensureMarketingSettings(week.productId),
  ]);

  const hook = post.hook ?? post.plainText.split("\n")[0] ?? "";
  const body = post.hook
    ? post.plainText.replace(hook, "").trim()
    : post.plainText.split("\n").slice(1).join("\n").trim();

  const regenPrompt = `${productFacts(product)}
Voice guidance: ${settings.voiceGuidance || "Clear, practical, credible, founder-led."}
Weekly storyline: ${week.storyline || "Not set"}
Post role: ${post.role}
Current hook: ${hook}
Current body:
${body}

${instructions?.trim() ? `Founder instruction: ${instructions.trim()}` : "Rewrite with a sharper hook and tighter, LinkedIn-native body."}

hook: max 90 chars, standalone, no hashtags.

${linkedinBodyRules(product.name)}

Return JSON: {"title":"","hook":"","body":"","imagePrompt":""}`;

  const regenSystem =
    "You edit one LinkedIn Page post for a legal technology founder. Use only supplied product facts. Write scannable posts with bullets and **bold** markers. Return valid JSON.";

  let result = await generate({
    system: regenSystem,
    prompt: regenPrompt,
    schema: postSchema.omit({ role: true }),
    task: "writing",
    temperature: 0.55,
  });

  const regenIssues = marketingDraftIssues(
    { storyline: week.storyline ?? "", posts: [{ ...result, role: post.role as PostRole }] },
    product.name,
  );
  if (regenIssues.length > 0) {
    result = await generate({
      system: regenSystem,
      prompt: `${regenPrompt}

Your prior draft was rejected:
${regenIssues.map((issue) => `- ${issue}`).join("\n")}

Rewrite and fix every issue.`,
      schema: postSchema.omit({ role: true }),
      task: "writing",
      temperature: 0.45,
    });
  }

  const composed = composePostText(result.hook, result.body);
  await db
    .update(marketingPosts)
    .set({
      title: result.title || post.title || "LinkedIn post",
      hook: composed.hook,
      plainText: composed.plainText,
      formattedText: composed.formattedText,
      imagePrompt: result.imagePrompt,
      savedAt: null,
      status: "draft",
      updatedAt: new Date(),
    })
    .where(eq(marketingPosts.id, postId));
}

export async function createManualMarketingPost(contentWeekId: number, slot?: WeekSlot) {
  const existing = await db
    .select()
    .from(marketingPosts)
    .where(eq(marketingPosts.contentWeekId, contentWeekId));
  const sequence = slot?.sequence ?? Math.max(0, ...existing.map((p) => p.sequence)) + 1;
  const [post] = await db
    .insert(marketingPosts)
    .values({
      contentWeekId,
      sequence,
      role: slot?.role ?? "custom",
      title: "Untitled post",
      plainText: "",
      formattedText: "",
      scheduledFor: slot?.date ?? null,
    })
    .returning();
  return post;
}

export async function saveMarketingPost(
  postId: number,
  input: { title: string; plainText: string; formattedText: string; imagePrompt?: string; hook?: string },
) {
  if (!input.plainText.trim()) throw new Error("Post text is empty");
  await db
    .update(marketingPosts)
    .set({
      title: input.title.trim() || "Untitled post",
      hook: input.hook?.trim() || null,
      plainText: input.plainText.trim(),
      formattedText: input.formattedText.trim() || input.plainText.trim(),
      imagePrompt: input.imagePrompt?.trim() || null,
      savedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(marketingPosts.id, postId));
}

export async function setMarketingPostStatus(
  postId: number,
  status: "draft" | "ready" | "posted" | "skipped",
) {
  const [post] = await db.select().from(marketingPosts).where(eq(marketingPosts.id, postId));
  if (!post) throw new Error("Post not found");
  await db
    .update(marketingPosts)
    .set({
      status,
      postedAt: status === "posted" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(marketingPosts.id, postId));

  if (status === "posted") {
    const [week] = await db.select().from(contentWeeks).where(eq(contentWeeks.id, post.contentWeekId));
    if (week) {
      await db.insert(activities).values({
        productId: week.productId,
        type: "post",
        channel: "linkedin",
        count: 1,
        note: post.hook ?? post.title ?? post.plainText.slice(0, 120),
      });
    }
  }
}

export async function updateMarketingSettings(
  productId: number,
  values: {
    reminderEnabled: boolean;
    reminderDay: number;
    timezone: string;
    weeklyTarget?: number;
    postingDays?: number[];
    postTime?: string;
    pastPosts?: string | null;
    voiceGuidance: string | null;
    imageStyle: string | null;
  },
) {
  const settings = await ensureMarketingSettings(productId);
  const weeklyTarget = values.weeklyTarget ?? settings.weeklyTarget;
  const postingDays = values.postingDays ?? parsePostingDays(settings.postingDays, weeklyTarget);

  await db
    .update(marketingSettings)
    .set({
      reminderEnabled: values.reminderEnabled,
      reminderDay: values.reminderDay,
      timezone: values.timezone,
      weeklyTarget: Math.min(5, Math.max(1, weeklyTarget)),
      postingDays: JSON.stringify(postingDays),
      postTime: values.postTime ?? settings.postTime,
      pastPosts: values.pastPosts !== undefined ? values.pastPosts : settings.pastPosts,
      voiceGuidance: values.voiceGuidance,
      imageStyle: values.imageStyle,
      updatedAt: new Date(),
    })
    .where(eq(marketingSettings.id, settings.id));
}

export async function updateMarketingCadence(
  productId: number,
  values: { weeklyTarget: number; postingDays: number[]; postTime: string },
) {
  const settings = await ensureMarketingSettings(productId);
  await db
    .update(marketingSettings)
    .set({
      weeklyTarget: Math.min(5, Math.max(1, values.weeklyTarget)),
      postingDays: JSON.stringify(values.postingDays),
      postTime: values.postTime,
      updatedAt: new Date(),
    })
    .where(eq(marketingSettings.id, settings.id));
}

export async function dismissMarketingReminder(productId: number) {
  const settings = await ensureMarketingSettings(productId);
  const postingDays = parsePostingDays(settings.postingDays, settings.weeklyTarget);
  const week = await getOrCreateWeek(
    productId,
    planningWeekStart(new Date(), postingDays, settings.timezone),
  );
  await db
    .update(contentWeeks)
    .set({ reminderDismissedAt: new Date(), updatedAt: new Date() })
    .where(eq(contentWeeks.id, week.id));
}

export async function getMarketingReminder(productId: number) {
  const { settings, week, postingDays } = await getMarketingWorkspace(productId);
  const counts = {
    total: postingDays.length,
    draft: week.posts.filter((post) => post.status === "draft").length,
    ready: week.posts.filter((post) => post.status === "ready").length,
    posted: week.posts.filter((post) => post.status === "posted").length,
  };
  return {
    settings,
    counts,
    due: isMarketingReminderDue({
      enabled: settings.reminderEnabled,
      reminderDay: settings.reminderDay,
      timezone: settings.timezone,
      dismissedAt: week.reminderDismissedAt,
      posted: counts.posted,
      target: settings.weeklyTarget,
    }),
  };
}

export type TodayMarketingAction =
  | { kind: "post_today"; hook: string; postId: number }
  | { kind: "draft_next"; dayLabel: string; postId?: number }
  | { kind: "plan_week" }
  | { kind: "none" };

export async function getTodayMarketingAction(productId: number): Promise<TodayMarketingAction> {
  const { week, slots, postingDays } = await getMarketingWorkspace(productId);
  const postsBySeq = new Map(week.posts.map((p) => [p.sequence, p]));

  const todaySlot = slots.find((s) => s.timing === "today");
  if (todaySlot) {
    const post = postsBySeq.get(todaySlot.sequence);
    if (post && (post.status === "ready" || post.status === "draft") && post.hook) {
      return { kind: "post_today", hook: post.hook, postId: post.id };
    }
    if (post && post.status !== "posted" && post.status !== "skipped") {
      return { kind: "draft_next", dayLabel: "today", postId: post.id };
    }
  }

  const nextSlot = slots.find((s) => s.timing === "upcoming");
  if (nextSlot) {
    const post = postsBySeq.get(nextSlot.sequence);
    if (!post || post.status === "draft") {
      return {
        kind: "draft_next",
        dayLabel: formatSlotDate(nextSlot.date),
        postId: post?.id,
      };
    }
  }

  const posted = week.posts.filter((p) => p.status === "posted").length;
  if (posted >= postingDays.length) return { kind: "none" };
  return { kind: "plan_week" };
}
