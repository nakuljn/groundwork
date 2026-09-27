import { TEMPLATE_KINDS, type OutreachTemplates } from "./outreach";

export const TARGET_FIRM_STORAGE_KEY = "groundwork:target-firm";
export const TARGET_NAME_STORAGE_KEY = "groundwork:target-name";
export const LAST_APPLIED_FIRM_STORAGE_KEY = "groundwork:last-applied-firm";

const TEMPLATE_FIELDS = TEMPLATE_KINDS.map((t) => t.field);

export function fillTemplatePlaceholders(text: string, name: string, org: string) {
  let out = text;
  if (name.trim()) out = out.replace(/\{name\}/gi, name.trim());
  if (org.trim()) out = out.replace(/\{org\}/gi, org.trim());
  return out;
}

/** Applies a firm name across one template string. */
export function applyFirmToText(text: string, newFirm: string, previousFirm?: string | null) {
  if (!text.trim() || !newFirm.trim()) return text;

  let out = text;
  const prev = previousFirm?.trim();
  if (prev && prev.toLowerCase() !== newFirm.trim().toLowerCase()) {
    out = out.split(prev).join(newFirm.trim());
  }
  out = out.replace(/\{org\}/gi, newFirm.trim());
  return out;
}

export function applyFirmToTemplates(
  templates: OutreachTemplates,
  newFirm: string,
  previousFirm?: string | null,
): OutreachTemplates {
  const next = { ...templates };
  for (const field of TEMPLATE_FIELDS) {
    next[field] = applyFirmToText(templates[field] ?? "", newFirm, previousFirm);
  }
  return next;
}
