import type { Product } from "@/types/domain";

export type TemplateKind =
  | "linkedin"
  | "message"
  | "inmail"
  | "linkedin_followup"
  | "email"
  | "followup";

export type MessageKind = TemplateKind | "all";

export type TemplateField =
  | "linkedinNote"
  | "linkedinMessage"
  | "inmail"
  | "linkedinFollowUp"
  | "coldEmail"
  | "followUp";

export type OutreachTemplates = Record<TemplateField, string>;

export const TEMPLATE_KINDS: {
  kind: TemplateKind;
  field: TemplateField;
  channel: "linkedin" | "email";
  label: string;
  when: string;
}[] = [
  {
    kind: "linkedin",
    field: "linkedinNote",
    channel: "linkedin",
    label: "Connection request note",
    when: "Attach to the invite. No link, no hard pitch: the goal is only to get accepted. Max 300 characters.",
  },
  {
    kind: "message",
    field: "linkedinMessage",
    channel: "linkedin",
    label: "Message after they accept",
    when: "For 1st-degree connections. Send within a day or two of them accepting. The first line shows in their notification preview.",
  },
  {
    kind: "inmail",
    field: "inmail",
    channel: "linkedin",
    label: "Sales Navigator InMail",
    when: "For people you are not connected to. Uses an InMail credit, so send to your best-fit leads. Paste the subject into the subject field.",
  },
  {
    kind: "linkedin_followup",
    field: "linkedinFollowUp",
    channel: "linkedin",
    label: "LinkedIn follow-up",
    when: "Reply in the same thread 4–5 days later if there is no response. Send once, not repeatedly.",
  },
  {
    kind: "email",
    field: "coldEmail",
    channel: "email",
    label: "Cold email",
    when: "When you have their email address.",
  },
  {
    kind: "followup",
    field: "followUp",
    channel: "email",
    label: "Email follow-up",
    when: "Reply in the same email thread 3–4 days later if there is no response.",
  },
];

export function templateFor(kind: TemplateKind) {
  const entry = TEMPLATE_KINDS.find((t) => t.kind === kind);
  if (!entry) throw new Error(`Unknown message type: ${kind}`);
  return entry;
}

export function linkedinTemplateKinds() {
  return TEMPLATE_KINDS.filter((t) => t.channel === "linkedin");
}

export function emailTemplateKinds() {
  return TEMPLATE_KINDS.filter((t) => t.channel === "email");
}

export function savedCountForChannel(savedFields: string[], channel: "linkedin" | "email") {
  const kinds = channel === "linkedin" ? linkedinTemplateKinds() : emailTemplateKinds();
  return kinds.filter((t) => savedFields.includes(t.field)).length;
}

export const LIMITS = {
  note: 300,
  inmailSubject: 200,
  inmailBody: 1900,
  emailSubject: 60,
};

/** Sentences the AI writes; greeting, intro, link and sign-off are added by code. */
export type OutreachSections = {
  noteBody: string;
  messageOpener: string;
  messageParagraphs: string[];
  inmailSubject: string;
  inmailOpener: string;
  inmailParagraphs: string[];
  linkedinFollowUpBody: string;
  emailSubject: string;
  emailParagraphs: string[];
  emailFollowUpBody: string;
};

export const BANNED_PHRASES = [
  "ai-driven",
  "elevate",
  "streamline",
  "revolutionize",
  "cutting-edge",
  "game-changer",
  "game changer",
  "seamless",
  "unlock",
  "empower",
  "leverage",
  "synergy",
  "i hope this finds you well",
  "i hope this message finds you",
  "looking forward to connecting",
  "explore how we can support",
  "i'm reaching out about",
  "i came across your profile",
  "quick question",
];

export function senderSignature(product: Product) {
  return [product.senderName, product.senderTitle, product.senderContact]
    .map((line) => line?.trim())
    .filter(Boolean)
    .join("\n");
}

const ACRONYM = /^[A-Z]{2,5}$/;

function roleForSentence(title: string, productName: string) {
  const escaped = productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let role = title
    .replace(new RegExp(`\\s*(?:[-–—|,@]|\\bat\\b|\\bof\\b)?\\s*${escaped}\\s*$`, "i"), "")
    .replace(new RegExp(`^\\s*${escaped}\\s*(?:[-–—|,])?\\s*`, "i"), "")
    .trim();
  role = role
    .split(/\s+/)
    .map((w) => (ACRONYM.test(w) ? w : w.toLowerCase()))
    .join(" ")
    .replace(/\bco[\s-]?founder\b/g, "co-founder");
  return role ? `${role} of ${productName}` : `from ${productName}`;
}

export function senderFirstName(product: Product) {
  return product.senderName?.trim().split(/\s+/)[0] ?? "";
}

export function senderIntroLine(product: Product, short = false) {
  const name = short ? senderFirstName(product) : product.senderName?.trim();
  if (!name) return null;
  const title = product.senderTitle?.trim();
  if (!title) return `I'm ${name} from ${product.name}.`;
  const role = roleForSentence(title, product.name);
  return role.startsWith("from ") ? `I'm ${name} ${role}.` : `I'm ${name}, ${role}.`;
}

export function messageLink(product: Product) {
  return product.websiteUrl?.trim() || null;
}

export function missingSettings(product: Product) {
  const missing: string[] = [];
  if (!product.senderName?.trim()) missing.push("your name (Settings → Your profile)");
  if (!product.brief?.trim() && !product.oneLiner?.trim()) {
    missing.push("a product brief or one-liner (Settings → Product)");
  }
  return missing;
}

export function settingsFacts(product: Product) {
  const lines = [`Product name: ${product.name}`];
  if (product.oneLiner?.trim()) lines.push(`One-liner: ${product.oneLiner.trim()}`);
  if (product.audience?.trim()) lines.push(`Who it's for: ${product.audience.trim()}`);
  if (product.offer?.trim()) lines.push(`Offer: ${product.offer.trim()}`);
  if (product.brief?.trim()) lines.push(`Product brief:\n${product.brief.trim()}`);
  return lines.join("\n");
}

function noteFrame(product: Product) {
  return `Hi {name}, ${senderIntroLine(product, true) ?? ""} `;
}

export function noteBodyBudget(product: Product) {
  // {name} expands to a first name, so leave room for a long one.
  return LIMITS.note - noteFrame(product).length - 12;
}

function paragraphs(list: string[]) {
  return list.map((p) => p.trim()).filter(Boolean);
}

function withLink(lines: string[], url: string | null) {
  return url ? [...lines, "", url] : lines;
}

export function assembleOutreach(product: Product, s: OutreachSections): OutreachTemplates {
  const intro = senderIntroLine(product) ?? "";
  const url = messageLink(product);
  const signature = senderSignature(product);
  const firstName = senderFirstName(product);

  const linkedinNote = `${noteFrame(product)}${s.noteBody.trim()}`.trim();

  const linkedinMessage = [
    "Hi {name},",
    "",
    s.messageOpener.trim(),
    "",
    ...paragraphs(s.messageParagraphs).flatMap((p) => [p, ""]),
    ...(url ? [url, ""] : []),
    "Thanks,",
    firstName,
  ].join("\n");

  const inmailBody = [
    "Hi {name},",
    "",
    s.inmailOpener.trim(),
    "",
    intro,
    "",
    ...paragraphs(s.inmailParagraphs).flatMap((p) => [p, ""]),
    ...(url ? [url, ""] : []),
    "Thanks,",
    signature,
  ].join("\n");
  const inmail = `Subject: ${stripSubject(s.inmailSubject)}\n\n${inmailBody}`;

  const linkedinFollowUp = [
    "Hi {name},",
    "",
    s.linkedinFollowUpBody.trim(),
    ...withLink([], url),
    "",
    firstName,
  ].join("\n");

  const coldEmail = [
    `Subject: ${stripSubject(s.emailSubject)}`,
    "",
    "Hi {name},",
    "",
    intro,
    "",
    ...paragraphs(s.emailParagraphs).flatMap((p) => [p, ""]),
    ...(url ? [url, ""] : []),
    "Thanks,",
    signature,
  ].join("\n");

  const followUp = [
    "Hi {name},",
    "",
    s.emailFollowUpBody.trim(),
    ...withLink([], url),
    "",
    "Thanks,",
    firstName,
  ].join("\n");

  return { linkedinNote, linkedinMessage, inmail, linkedinFollowUp, coldEmail, followUp };
}

function stripSubject(subject: string) {
  return subject.replace(/^subject:\s*/i, "").trim();
}

export function sectionIssues(s: OutreachSections, product: Product) {
  const issues: string[] = [];
  const all = [
    s.noteBody,
    s.messageOpener,
    ...s.messageParagraphs,
    s.inmailSubject,
    s.inmailOpener,
    ...s.inmailParagraphs,
    s.linkedinFollowUpBody,
    s.emailSubject,
    ...s.emailParagraphs,
    s.emailFollowUpBody,
  ].join("\n");
  const lower = all.toLowerCase();

  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) issues.push(`Do not use "${phrase}".`);
  }
  if (/\[[^\]]+\]/.test(all)) issues.push("No bracket placeholders like [Name].");
  if (/https?:\/\/|www\./i.test(all)) {
    issues.push("Do not write any URL; the link is added automatically.");
  }
  if (/^\s*(hi|hello|dear)\b/im.test(all)) {
    issues.push("Do not start any section with a greeting; greetings are added automatically.");
  }
  if (/\b(thanks|regards|best wishes|cheers),?\s*$/im.test(all)) {
    issues.push("Do not end any section with a sign-off; sign-offs are added automatically.");
  }
  if (all.includes("!")) issues.push("No exclamation marks.");

  const noteBudget = noteBodyBudget(product);
  if (s.noteBody.length > noteBudget) {
    issues.push(`noteBody is ${s.noteBody.length} characters; it must be at most ${noteBudget}.`);
  }
  const offer = product.offer?.trim().toLowerCase();
  if (offer && s.noteBody.toLowerCase().includes(offer)) {
    issues.push("noteBody must not pitch the offer; save it for the message after they accept.");
  }
  if (s.messageParagraphs.length < 2 || s.messageParagraphs.length > 4) {
    issues.push("messageParagraphs must have 2–4 paragraphs.");
  }
  if (s.inmailParagraphs.length < 2 || s.inmailParagraphs.length > 3) {
    issues.push("inmailParagraphs must have 2–3 paragraphs.");
  }
  if (s.emailParagraphs.length < 2 || s.emailParagraphs.length > 3) {
    issues.push("emailParagraphs must have 2–3 paragraphs.");
  }
  if (s.emailSubject.length > LIMITS.emailSubject) {
    issues.push(`emailSubject must be under ${LIMITS.emailSubject} characters.`);
  }
  if (s.inmailSubject.length > 70) issues.push("inmailSubject must be under 70 characters.");

  return issues;
}

export function fitToLimits(templates: OutreachTemplates): OutreachTemplates {
  const body = templates.inmail.split("\n\n").slice(1).join("\n\n");
  if (body.length > LIMITS.inmailBody) {
    throw new Error(
      `InMail body is ${body.length} characters; Sales Navigator allows ${LIMITS.inmailBody}. Redraft or ask for a shorter version.`,
    );
  }
  return templates;
}
