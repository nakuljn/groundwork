import type { Contact, OutreachCategory } from "@/types/domain";
import type { Blueprint } from "./blueprint/schema";
import {
  contactCategoriesFromBlueprint,
  inferCategoryKey as inferCategoryKeyFromBlueprint,
  isOrganizationGroup,
  messageGroupKey as messageGroupKeyFromBlueprint,
  messageGroupsFromBlueprint,
  organizationSegment,
  personaForGroup,
  roleFromTitle,
  segmentRole,
} from "./blueprint/helpers";
import { LEGAL_INDIA_BLUEPRINT } from "./blueprint/legal-india.fixture";

export type MessageGroup = ReturnType<typeof messageGroupsFromBlueprint>[number];

export function messageGroups(blueprint: Blueprint) {
  return messageGroupsFromBlueprint(blueprint);
}

/** @deprecated use messageGroups(blueprint) */
export const MESSAGE_GROUPS = messageGroupsFromBlueprint(LEGAL_INDIA_BLUEPRINT);

export function isFirmGroup(blueprint: Blueprint, key: string) {
  return isOrganizationGroup(blueprint, key);
}

/** Back-compat without blueprint arg */
export function isFirmGroupKey(key: string) {
  return isOrganizationGroup(LEGAL_INDIA_BLUEPRINT, key);
}

export function firmRole(blueprint: Blueprint, key: string) {
  return segmentRole(blueprint, key);
}

export function roleFromContactTitle(blueprint: Blueprint, title: string | null | undefined) {
  return roleFromTitle(blueprint, title);
}

/** @deprecated use roleFromContactTitle(blueprint, title) */
export function firmRoleFromTitle(title: string | null | undefined) {
  return roleFromTitle(LEGAL_INDIA_BLUEPRINT, title);
}

export function messageGroupKey(blueprint: Blueprint, contact: Pick<Contact, "category" | "role">) {
  return messageGroupKeyFromBlueprint(blueprint, contact);
}

export function inferCategoryKey(
  blueprint: Blueprint,
  input: {
    type?: string | null;
    sizeEstimate?: string | null;
    personName?: string | null;
    firmName?: string | null;
  },
) {
  return inferCategoryKeyFromBlueprint(blueprint, input);
}

export function orgContactCategory(blueprint: Blueprint) {
  return organizationSegment(blueprint)?.contactCategory ?? "organization";
}

export function applyTemplate(
  template: string,
  contact: Pick<Contact, "name" | "org" | "city">,
  extras?: { link?: string | null; orgPlaceholder?: string },
) {
  const firstName = contact.name.split(/\s+/)[0] ?? contact.name;
  const link = extras?.link?.trim();
  const orgFallback = extras?.orgPlaceholder ?? "your organization";
  return template
    .replace(/\{name\}/gi, firstName)
    .replace(/\{fullName\}/gi, contact.name)
    .replace(/\{org\}/gi, contact.org ?? orgFallback)
    .replace(/\{city\}/gi, contact.city ?? "")
    .replace(/\{link\}/gi, link ?? "{link}");
}

export function readerFor(blueprint: Blueprint, groupKey: string) {
  return personaForGroup(blueprint, groupKey);
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
  return !!(
    cat.linkedinNote ||
    cat.linkedinMessage ||
    cat.inmail ||
    cat.linkedinFollowUp ||
    cat.coldEmail
  );
}

export function categoryHasLinkedInDraft(cat: OutreachCategory) {
  return !!(cat.linkedinNote || cat.linkedinMessage || cat.inmail || cat.linkedinFollowUp);
}

export function contactCategories(blueprint: Blueprint) {
  return contactCategoriesFromBlueprint(blueprint);
}

/** @deprecated use contactCategories(blueprint) or useBlueprint() in client components */
export const DEFAULT_CATEGORIES = contactCategoriesFromBlueprint(LEGAL_INDIA_BLUEPRINT);
