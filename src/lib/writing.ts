import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  activities,
  outreachCategories,
  products,
  type OutreachCategory,
  type Product,
} from "@/db/schema";
import { generate } from "./ai";
import { isFirmGroup, savedFieldsOf, type CategoryKey } from "./categories";
import { getCategories } from "./categories-server";
import {
  BANNED_PHRASES,
  TEMPLATE_KINDS,
  assembleOutreach,
  fitToLimits,
  missingSettings,
  noteBodyBudget,
  sectionIssues,
  senderIntroLine,
  settingsFacts,
  templateFor,
  type MessageKind,
  type OutreachSections,
  type OutreachTemplates,
  type TemplateKind,
} from "./outreach";

const activityParseSchema = z.object({
  activities: z.array(
    z.object({
      type: z.string(),
      channel: z.string(),
      count: z.number().default(1),
      note: z.string(),
      outcome: z.string().nullish(),
      costInr: z.coerce.number().nullish(),
    }),
  ),
});

const paragraphList = z.array(z.string().min(10)).min(1);

const sectionsSchema = z.object({
  noteBody: z.string().min(20),
  messageOpener: z.string().min(10),
  messageParagraphs: paragraphList,
  inmailSubject: z.string().min(3),
  inmailOpener: z.string().min(10),
  inmailParagraphs: paragraphList,
  linkedinFollowUpBody: z.string().min(20),
  emailSubject: z.string().min(3),
  emailParagraphs: paragraphList,
  emailFollowUpBody: z.string().min(20),
});

type ReaderBrief = {
  label: string;
  who: string;
  caresAbout: string;
  ask: string;
  tone: string;
};

const READERS: Record<string, ReaderBrief> = {
  advocate: {
    label: "advocate",
    who: "An individual advocate: a solo practitioner or someone running a small chamber. They draft, translate and track their own matters, often between hearings, and read LinkedIn on their phone.",
    caresAbout:
      "Hours back in their own week, fewer late nights on drafting and translation, getting it right in front of the court and the client, and cost.",
    ask: "Try it themselves on their next real draft or matter.",
    tone: "One practitioner to another. Respectful, plain, never salesy. Talk about their day, not about a team.",
  },
  firm_cxo: {
    label: "managing partner",
    who: "The managing or founding partner of a law firm, or a firm leader such as the COO, CTO or head of knowledge management. They decide which tools the whole firm uses.",
    caresAbout:
      "Consistent quality across many lawyers, client turnaround, taking on more work without adding headcount, confidentiality of client documents, and whether lawyers will actually adopt a new tool. Not the mechanics of one draft.",
    ask: "A 15–20 minute walkthrough, or a small pilot with one team at the firm.",
    tone: "Senior to senior. The shortest and most direct of all the sets. No flattery, no detail they would delegate. Talk about the firm, using {org}.",
  },
  firm_partner: {
    label: "partner",
    who: "A partner at a law firm who runs a practice group or a book of client matters, with associates working under them.",
    caresAbout:
      "Turnaround on client work, the time they spend reviewing and correcting juniors' drafts, keeping quality consistent across their team, and handling peak workload.",
    ask: "Try it on one live matter with their team, or a short walkthrough.",
    tone: "Direct and practical. Talk about their team and their matters, not the whole firm.",
  },
  firm_senior_associate: {
    label: "senior associate",
    who: "A senior associate at a law firm. They run matters day to day, still draft heavily, and are the first reviewer of juniors' work before it reaches the partner.",
    caresAbout:
      "Faster first drafts and translations, less rework when reviewing juniors, meeting partners' deadlines, and being the person who finds a tool that makes the team better.",
    ask: "Try it themselves on their next draft; if it helps, they can show it to their partner. Never ask them to buy it or decide for the firm.",
    tone: "Collegial, peer to peer. Acknowledge the pressure of their role without being dramatic.",
  },
  firm_associate: {
    label: "associate",
    who: "A junior associate at a law firm (roughly 1–4 years). They do most of the first drafts, translations, research and case-file preparation, often late at night.",
    caresAbout:
      "Getting first drafts done faster and right the first time, fewer late nights, and handing in work that holds up in review.",
    ask: "Try it free on their next draft. No demo request, no talk of buying or firm decisions.",
    tone: "Friendly and informal-professional, like an older colleague. The lightest messages of all the sets.",
  },
};

function readerFor(category: { key: string }) {
  return READERS[category.key] ?? (isFirmGroup(category.key) ? READERS.firm_partner : READERS.advocate);
}

function sectionsPrompt(
  product: Product,
  category: { key: string; name: string; description: string | null },
) {
  const reader = readerFor(category);
  const firm = isFirmGroup(category.key);
  const offer = product.offer?.trim();
  const offerRule = offer
    ? `state the offer exactly as "${offer}"`
    : "invite them to try it (there is no special offer)";
  const noteIntro = senderIntroLine(product, true);
  const orgRule = firm
    ? "You may use {org} (their firm's name) where it reads naturally, at most once per piece."
    : "Do not use {org}; these are individual advocates.";
  const firmRule = firm
    ? `\nThe founder writes to several people at the same firm, one role at a time. Each message must stand alone: never mention colleagues, other people at the firm, or that anyone else was contacted.`
    : "";

  return `PRODUCT FACTS (the only information you may use about the product):
${settingsFacts(product)}

READER — ${reader.label.toUpperCase()}:
Who they are: ${reader.who}
What they care about: ${reader.caresAbout}
What to ask for: ${reader.ask}
Tone: ${reader.tone}
${orgRule}${firmRule}

CONTEXT: The founder finds these lawyers on LinkedIn Sales Navigator and reaches out one-to-one. You are writing every piece of that sequence for this one reader type. Greetings ("Hi {name},"), the sender's introduction, the link and sign-offs are added automatically: never write them, never write a URL.

BEFORE WRITING: pick the one or two product facts that matter most to THIS reader given what they care about, and build every piece around them. A ${reader.label} should feel it was written for someone in their exact role, not for lawyers in general.

LINKEDIN, STEP BY STEP

1. noteBody — connection request note.
   It will read: "Hi {name}, ${noteIntro ?? ""} " + noteBody. At most ${noteBodyBudget(product)} characters.
   The only goal is to get the invite accepted. Say in one or two sentences what you are building, in a few words, and why you want to connect with a ${reader.label} in particular.
   No offer, no trial, no request for a call, no link. Pitching in an invite gets it ignored. It should read like one professional writing to a peer.

2. messageOpener + messageParagraphs — the direct message sent after they accept.
   messageOpener is the first line after "Hi {name},". It appears in their LinkedIn notification and inbox preview, so it decides whether they open it. One sentence: thank them for connecting in a natural way and give the reason you are writing. They already saw your name and title, so do not reintroduce yourself.
   messageParagraphs: 2–4 short paragraphs, 1–3 sentences each (people read LinkedIn on their phone).
     - what ${product.name} does, concretely, in terms of this reader's work
     - what changes for a ${reader.label}, tied to what they care about
     - the ask (${reader.ask}) — ${offerRule}, and say the link is below
     - optionally, end with one easy question a ${reader.label} can answer in a line, so replying feels natural
   Tone: a conversation in a chat window, not an email.

3. inmailSubject + inmailOpener + inmailParagraphs — Sales Navigator InMail to someone who is not connected.
   inmailSubject: under 70 characters, reads like a note from a person, specific to a ${reader.label}'s work. Not an ad headline.
   inmailOpener: one sentence right after "Hi {name}," on why you are writing to them in particular, based on their role as a ${reader.label}. Do not invent details about them. Your introduction follows automatically.
   inmailParagraphs: 2–3 paragraphs: what it is, the concrete difference for a ${reader.label}, then the ask — ${offerRule} and say the link is below. The whole InMail must stay under 1,200 characters. They do not know you, so respect their time and make it easy to say yes.

4. linkedinFollowUpBody — follow-up in the same LinkedIn thread 4–5 days later if there was no reply.
   2–3 sentences. No guilt ("just bumping this", "did you see my message"). Add one new angle from what this reader cares about that was not used above, and restate the ask lightly.

EMAIL

5. emailSubject: under 60 characters, specific, no clickbait, no ALL CAPS.
6. emailParagraphs: 2–3 paragraphs after the sender's introduction line: what it is; the concrete difference for a ${reader.label}; then the ask — ${offerRule} and say the link is below.
7. emailFollowUpBody: 2–3 sentences, a polite reply in the same email thread 3–4 days later, with one new angle.

STYLE FOR EVERYTHING
- A founder writing to one ${reader.label}: warm, direct, specific. Second person ("you", "your").
- Plain English. Every sentence says something concrete. Test each piece: would a busy ${reader.label} reading it on a phone understand in five seconds what this is and what you want?
- You may name the kind of work a ${reader.label} does to make a point concrete, but every claim about the product must come from PRODUCT FACTS.
- Only mention features, audiences and offers present in PRODUCT FACTS. Do not invent numbers, clients, results, security claims or features.
- Rewrite facts as natural sentences; never paste them as fragments. No generic lines that could be sent to anyone in any industry.
- Vary wording across the pieces; do not repeat the same sentence in every format.
- Never use: ${BANNED_PHRASES.join(", ")}.
- No URLs, no brackets, no emojis, no exclamation marks, no hashtags.

Return JSON:
{"noteBody":"","messageOpener":"","messageParagraphs":[""],"inmailSubject":"","inmailOpener":"","inmailParagraphs":[""],"linkedinFollowUpBody":"","emailSubject":"","emailParagraphs":[""],"emailFollowUpBody":""}`;
}

async function writeSections(
  product: Product,
  category: { key: string; name: string; description: string | null },
  feedback?: string,
): Promise<OutreachSections> {
  const missing = missingSettings(product);
  if (missing.length > 0) {
    throw new Error(`Add ${missing.join(" and ")} before drafting.`);
  }

  const system =
    "You are an experienced B2B copywriter who writes short, credible cold outreach for founders selling to lawyers and law firms in India. You understand how Indian law firms are structured and write differently for a managing partner than for a junior associate. You never invent facts.";
  const base = sectionsPrompt(product, category);
  const prompt = feedback ? `${base}\n\n${feedback}` : base;

  const first = await generate({
    system,
    prompt,
    schema: sectionsSchema,
    task: "writing",
    temperature: 0.5,
  });
  const issues = sectionIssues(first, product);
  if (issues.length === 0) return first;

  const second = await generate({
    system,
    prompt: `${prompt}

Your previous attempt:
${JSON.stringify(first, null, 2)}

Fix these problems and return the full JSON again:
${issues.map((i) => `- ${i}`).join("\n")}`,
    schema: sectionsSchema,
    task: "writing",
    temperature: 0.3,
  });

  const budget = noteBodyBudget(product);
  if (second.noteBody.length > budget) {
    const cut = second.noteBody.slice(0, budget);
    const end = cut.lastIndexOf(".");
    second.noteBody = end > 40 ? cut.slice(0, end + 1) : cut;
  }
  return second;
}

async function draftCategoryMessages(
  category: { name: string; description: string | null; key: string },
  product: Product,
  feedback?: string,
): Promise<OutreachTemplates> {
  const sections = await writeSections(product, category, feedback);
  return fitToLimits(assembleOutreach(product, sections));
}

async function loadCategoryPair(categoryId: number) {
  const [category] = await db
    .select()
    .from(outreachCategories)
    .where(eq(outreachCategories.id, categoryId));
  if (!category) throw new Error("Category not found");

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, category.productId));
  if (!product) throw new Error("Product not found");

  return { category, product };
}

export async function parseAndLogActivity(productId: number, text: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId));

  if (!product) throw new Error("Product not found");

  const result = await generate({
    system: `Parse the founder's free-text update into structured activity log entries. Use types: linkedin_outreach, cold_email, post, call, meeting, ad_campaign, purchase, other. Use channels: linkedin, google, instagram_fb, email, offline, other. "costInr" is money the founder paid for marketing or sales (ads, subscriptions like Sales Navigator, tools, events), in rupees; 0 if nothing was paid. A purchase with no outreach is type "purchase". Return JSON: {"activities":[{"type":"","channel":"","count":1,"note":"","outcome":"","costInr":0}]}`,
    prompt: `Product: ${product.name}\nUpdate: ${text}`,
    schema: activityParseSchema,
  });

  for (const item of result.activities) {
    await db.insert(activities).values({
      productId,
      type: item.type,
      channel: item.channel,
      count: item.count,
      note: item.note,
      outcome: item.outcome ?? null,
      costInr: Math.max(0, Math.round(item.costInr ?? 0)),
    });
  }

  return result.activities.length;
}

export async function generateProductBrief(productId: number, rawContext: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId));

  if (!product) throw new Error("Product not found");

  const briefSchema = z.preprocess((val) => {
    if (typeof val === "string") return { brief: val };
    if (typeof val === "object" && val !== null) {
      const obj = val as Record<string, unknown>;
      if (typeof obj.brief === "string") return obj;
      for (const key of ["productBrief", "product_brief", "content", "text", "summary"]) {
        if (typeof obj[key] === "string") return { brief: obj[key] };
      }
    }
    return val;
  }, z.object({ brief: z.string().min(20) }));

  const result = await generate({
    system:
      'Write a concise product brief for sales and outreach. Include: what it does, who it is for, strongest value prop, proof points, and 2-3 suggested customer segments. Under 400 words. Respond with JSON only in this exact shape: {"brief":"your brief here"}',
    prompt: `Product name: ${product.name}
One-liner: ${product.oneLiner ?? ""}
Audience: ${product.audience ?? ""}
Offer: ${product.offer ?? ""}
Goal: ${product.goal ?? ""}

Raw material:
${rawContext || "No repo or website material was found. Use the fields above."}`,
    schema: briefSchema,
  });

  await db
    .update(products)
    .set({ brief: result.brief })
    .where(eq(products.id, productId));

  await getCategories(productId);

  return result.brief;
}

function currentTemplates(category: OutreachCategory) {
  return Object.fromEntries(
    TEMPLATE_KINDS.map((t) => [t.field, category[t.field] ?? ""]),
  ) as OutreachTemplates;
}

/** Drafts every template that has not been saved as final. */
export async function generateCategoryMessages(categoryId: number) {
  const { category, product } = await loadCategoryPair(categoryId);
  const saved = savedFieldsOf(category);
  if (saved.length === TEMPLATE_KINDS.length) {
    throw new Error("All templates are saved as final. Regenerate one type to replace it.");
  }

  const result = await draftCategoryMessages(category, product);
  const merged = currentTemplates(category);
  for (const t of TEMPLATE_KINDS) {
    if (!saved.includes(t.field)) merged[t.field] = result[t.field];
  }

  await db
    .update(outreachCategories)
    .set({ ...merged, updatedAt: new Date() })
    .where(eq(outreachCategories.id, categoryId));

  return merged;
}

/** Rewrites one template, optionally following the founder's instructions. Clears its saved state. */
export async function regenerateCategoryTemplate(
  categoryId: number,
  kind: TemplateKind,
  instructions?: string,
) {
  const { category, product } = await loadCategoryPair(categoryId);
  const target = templateFor(kind);
  const current = currentTemplates(category);
  const text = instructions?.trim();

  const feedback = text
    ? `CURRENT ${target.label.toUpperCase()}:
${current[target.field] || "(none)"}

FOUNDER'S FEEDBACK on the ${target.label}:
${text}

Apply the feedback to that piece while keeping every rule above.`
    : undefined;

  const result = await draftCategoryMessages(category, product, feedback);
  const saved = savedFieldsOf(category).filter((f) => f !== target.field);

  await db
    .update(outreachCategories)
    .set({
      [target.field]: result[target.field],
      savedFields: JSON.stringify(saved),
      updatedAt: new Date(),
    })
    .where(eq(outreachCategories.id, categoryId));

  return result[target.field];
}

/** Stores the founder's final wording so redrafting never overwrites it. */
export async function saveCategoryTemplate(categoryId: number, kind: TemplateKind, text: string) {
  const body = text.trim();
  if (!body) throw new Error("Template is empty");

  const [category] = await db
    .select()
    .from(outreachCategories)
    .where(eq(outreachCategories.id, categoryId));
  if (!category) throw new Error("Category not found");

  const { field } = templateFor(kind);
  const saved = Array.from(new Set([...savedFieldsOf(category), field]));

  await db
    .update(outreachCategories)
    .set({ [field]: body, savedFields: JSON.stringify(saved), updatedAt: new Date() })
    .where(eq(outreachCategories.id, categoryId));
}

export async function refineCategoryMessages(
  categoryId: number,
  instructions: string,
  kind: MessageKind = "all",
) {
  if (!instructions.trim()) throw new Error("Say how you want the message changed");
  if (kind === "all") throw new Error("Pick one message type to change");
  return regenerateCategoryTemplate(categoryId, kind, instructions);
}

/** @deprecated use generateCategoryMessages */
export async function generateContactMessages(contactId: number) {
  void contactId;
  throw new Error("Messages are drafted per category now, not per contact");
}

/** @deprecated use refineCategoryMessages */
export async function refineContactMessages(
  contactId: number,
  instructions: string,
  kind: MessageKind = "all",
) {
  void contactId;
  void instructions;
  void kind;
  throw new Error("Messages are edited per category now, not per contact");
}

export type { CategoryKey };
