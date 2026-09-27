import type { Contact, OutreachCategory } from "@/types/domain";

/** How a contact is segmented: an individual advocate or someone at a firm. */
export const DEFAULT_CATEGORIES = [
  {
    key: "firm",
    name: "Firms",
    description: "Mid-size and large law firms, corporate practices, multi-lawyer chambers.",
  },
  {
    key: "advocate",
    name: "Advocates",
    description: "Solo practitioners and small chambers — individual decision-makers.",
  },
] as const;

export type CategoryKey = (typeof DEFAULT_CATEGORIES)[number]["key"];

/** Firm roles in the order to approach them inside one firm. */
export const FIRM_ROLES = [
  {
    key: "firm_cxo",
    name: "Managing Partner / CXO",
    reader: "managing partner",
    description:
      "Managing or founding partner, COO, CTO, head of knowledge or innovation. Decides what the whole firm uses.",
  },
  {
    key: "firm_partner",
    name: "Partner",
    reader: "partner",
    description: "Runs a practice group or a set of client matters. Decides what their team uses.",
  },
  {
    key: "firm_senior_associate",
    name: "Senior Associate",
    reader: "senior associate",
    description:
      "Runs matters day to day, reviews juniors' drafts. The person who brings a tool to the partner.",
  },
  {
    key: "firm_associate",
    name: "Associate",
    reader: "associate",
    description: "Does most first drafts, translations and research. The heaviest daily user.",
  },
] as const;

export type FirmRoleKey = (typeof FIRM_ROLES)[number]["key"];

/** Every set of message templates: one for advocates, one per firm role. */
export const MESSAGE_GROUPS = [
  {
    key: "advocate",
    name: "Advocates",
    description: DEFAULT_CATEGORIES[1].description,
  },
  ...FIRM_ROLES.map(({ key, name, description }) => ({ key, name, description })),
];

export function isFirmGroup(key: string) {
  return key === "firm" || key.startsWith("firm_");
}

export function firmRole(key: string) {
  return FIRM_ROLES.find((r) => r.key === key);
}

/** Reads a LinkedIn title and picks which firm role's messages fit. Defaults to partner. */
export function firmRoleFromTitle(title: string | null | undefined): FirmRoleKey {
  const t = (title ?? "").toLowerCase();
  if (/\b(senior|principal|managing) associate\b/.test(t)) return "firm_senior_associate";
  if (
    /\b(managing|founding|name) partner\b|\bco-?founder\b|\bfounder\b|\bchairman\b|\bchief\b|\b(ceo|coo|cto|cfo|cio|cko)\b|\bhead of (knowledge|innovation|operations|technology|legal ops)/.test(
      t,
    )
  ) {
    return "firm_cxo";
  }
  if (/\bpartner\b/.test(t)) return "firm_partner";
  if (/\bassociate\b/.test(t)) return "firm_associate";
  return "firm_partner";
}

export function messageGroupKey(contact: Pick<Contact, "category" | "role">) {
  return contact.category === "firm" ? firmRoleFromTitle(contact.role) : "advocate";
}

export function inferCategoryKey(input: {
  type?: string | null;
  sizeEstimate?: string | null;
  personName?: string | null;
  firmName?: string | null;
}): CategoryKey {
  const blob = `${input.type ?? ""} ${input.sizeEstimate ?? ""}`.toLowerCase();
  if (blob.includes("solo") || blob.includes("individual") || blob.includes("1-2")) {
    return "advocate";
  }
  if (blob.includes("firm") || blob.includes("company") || blob.includes("10+") || blob.includes("50")) {
    return "firm";
  }
  if (input.personName && input.firmName && input.personName !== input.firmName) {
    return "firm";
  }
  return "advocate";
}

export function applyTemplate(
  template: string,
  contact: Pick<Contact, "name" | "org" | "city">,
  extras?: { link?: string | null },
) {
  const firstName = contact.name.split(/\s+/)[0] ?? contact.name;
  const link = extras?.link?.trim();
  return template
    .replace(/\{name\}/gi, firstName)
    .replace(/\{fullName\}/gi, contact.name)
    .replace(/\{org\}/gi, contact.org ?? "your firm")
    .replace(/\{city\}/gi, contact.city ?? "")
    .replace(/\{link\}/gi, link ?? "{link}");
}

export function savedFieldsOf(cat: Pick<OutreachCategory, "savedFields">): string[] {
  try {
    const parsed: unknown = JSON.parse(cat.savedFields || "[]");
    return Array.isArray(parsed) ? parsed.filter((f): f is string => typeof f === "string") : [];
  } catch {
    return [];
  }
}

export function categoryHasDraft(cat: OutreachCategory) {
  return !!(cat.linkedinNote || cat.linkedinMessage || cat.inmail || cat.coldEmail);
}
