import type { Contact } from "@/types/domain";
import type {
  Blueprint,
  MessageGroup,
  NavigatorGuide,
  Persona,
  Segment,
  SegmentRole,
  TrackTemplate,
} from "./schema";

export function messageGroupsFromBlueprint(blueprint: Blueprint): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const segment of blueprint.segments) {
    if (segment.kind === "individual" && segment.persona) {
      groups.push({
        key: segment.messageGroupKey,
        name: segment.name,
        description: segment.description,
        segmentKey: segment.key,
        kind: "individual",
      });
      continue;
    }
    for (const role of segment.roles ?? []) {
      groups.push({
        key: role.key,
        name: role.name,
        description: role.description,
        segmentKey: segment.key,
        kind: "organization",
      });
    }
  }
  return groups;
}

export function organizationSegment(blueprint: Blueprint): Segment | undefined {
  return blueprint.segments.find((s) => s.kind === "organization");
}

export function individualSegment(blueprint: Blueprint): Segment | undefined {
  return blueprint.segments.find((s) => s.kind === "individual");
}

export function segmentRole(blueprint: Blueprint, key: string): SegmentRole | undefined {
  for (const segment of blueprint.segments) {
    const role = segment.roles?.find((r) => r.key === key);
    if (role) return role;
  }
  return undefined;
}

export function isOrganizationGroup(blueprint: Blueprint, key: string): boolean {
  if (key === organizationSegment(blueprint)?.contactCategory) return true;
  return !!segmentRole(blueprint, key);
}

export function personaForGroup(blueprint: Blueprint, groupKey: string): Persona | undefined {
  const individual = individualSegment(blueprint);
  if (individual?.messageGroupKey === groupKey && individual.persona) {
    return individual.persona;
  }
  return segmentRole(blueprint, groupKey)?.persona;
}

export function roleFromTitle(blueprint: Blueprint, title: string | null | undefined): string {
  const org = organizationSegment(blueprint);
  if (!org?.roles?.length) return org?.messageGroupKey ?? "default";

  const t = (title ?? "").toLowerCase();
  const sorted = [...org.roles].sort((a, b) => a.approachOrder - b.approachOrder);

  for (const role of sorted) {
    if (role.persona.bannedAngles?.some((b: string) => t.includes(b.toLowerCase()))) continue;
    for (const pattern of role.titlePatterns) {
      const p = pattern.toLowerCase();
      if (p.includes(" ") ? t.includes(p) : new RegExp(`\\b${escapeRegex(p)}\\b`).test(t)) {
        return role.key;
      }
    }
  }

  const partner = org.roles.find((r) => r.key.includes("partner"));
  return partner?.key ?? sorted[0]?.key ?? groupKeyFallback(blueprint);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function groupKeyFallback(blueprint: Blueprint) {
  const org = organizationSegment(blueprint);
  const partner = org?.roles?.find((r) => r.key.includes("partner"));
  return partner?.key ?? org?.roles?.[0]?.key ?? "default";
}

export function messageGroupKey(
  blueprint: Blueprint,
  contact: Pick<Contact, "category" | "role">,
): string {
  const org = organizationSegment(blueprint);
  if (contact.category === org?.contactCategory) {
    return roleFromTitle(blueprint, contact.role);
  }
  const individual = individualSegment(blueprint);
  return individual?.messageGroupKey ?? contact.category;
}

export function inferCategoryKey(
  blueprint: Blueprint,
  input: {
    type?: string | null;
    sizeEstimate?: string | null;
    personName?: string | null;
    firmName?: string | null;
  },
): string {
  const blob = `${input.type ?? ""} ${input.sizeEstimate ?? ""}`.toLowerCase();
  const individual = individualSegment(blueprint);
  const org = organizationSegment(blueprint);

  for (const signal of blueprint.inferCategory.individualSignals) {
    if (blob.includes(signal.toLowerCase())) {
      return individual?.contactCategory ?? "individual";
    }
  }
  for (const signal of blueprint.inferCategory.organizationSignals) {
    if (blob.includes(signal.toLowerCase())) {
      return org?.contactCategory ?? "organization";
    }
  }
  if (input.personName && input.firmName && input.personName !== input.firmName) {
    return org?.contactCategory ?? "organization";
  }
  return individual?.contactCategory ?? "individual";
}

export function navigatorGuide(blueprint: Blueprint, groupKey: string): NavigatorGuide {
  const role = segmentRole(blueprint, groupKey);
  if (role?.channelGuides.salesNavigator) return role.channelGuides.salesNavigator;

  const segment = blueprint.segments.find(
    (s) => s.messageGroupKey === groupKey || s.key === groupKey,
  );
  if (segment?.channelGuides.salesNavigator) return segment.channelGuides.salesNavigator;

  const orgRole = organizationSegment(blueprint)?.roles?.find((r) => r.key.includes("partner"));
  if (orgRole?.channelGuides.salesNavigator) return orgRole.channelGuides.salesNavigator;

  const advocate = individualSegment(blueprint);
  if (advocate?.channelGuides.salesNavigator) {
    return advocate.channelGuides.salesNavigator;
  }

  return {
    titleBoolean: "",
    listName: "Prospects – <city>",
    filters: [],
  };
}

export function orgApproachSequence(blueprint: Blueprint): string[] {
  return organizationSegment(blueprint)?.orgApproachSequence ?? [];
}

export function trackTemplates(blueprint: Blueprint): TrackTemplate[] {
  return blueprint.tracks;
}

export function getTrackTemplate(blueprint: Blueprint, key: string): TrackTemplate | undefined {
  return blueprint.tracks.find((t) => t.key === key);
}

export function audienceContextFromBlueprint(blueprint: Blueprint): string {
  return blueprint.content.audienceSummary;
}

export function linkedinHashtags(blueprint: Blueprint, productName: string): string[] {
  const slug = productName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  const productTag = slug ? `#${slug}` : blueprint.content.industryHashtag ?? "#product";
  const tags = [...blueprint.content.hashtags];
  if (!tags.some((t) => t.toLowerCase() === productTag.toLowerCase())) {
    tags.splice(1, 0, productTag);
  }
  return tags.slice(0, 3);
}

export function linkedinHashtagLine(blueprint: Blueprint, productName: string): string {
  return linkedinHashtags(blueprint, productName).join(" ");
}

/** Contact import categories — individual segment + org roles. */
export function contactCategoriesFromBlueprint(blueprint: Blueprint) {
  const categories: Array<{ key: string; name: string }> = [];
  for (const segment of blueprint.segments) {
    if (segment.kind === "individual") {
      categories.push({ key: segment.contactCategory, name: segment.name });
      continue;
    }
    for (const role of segment.roles ?? []) {
      categories.push({ key: role.key, name: role.name });
    }
  }
  return categories;
}
