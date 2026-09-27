import type { Contact } from "@/types/domain";
import type { Prospect } from "@/lib/prospect-types";

function norm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9@.]/g, "");
}

export function isDuplicateProspect(prospect: Prospect, contacts: Contact[]) {
  const name = norm(prospect.personName || prospect.firmName);
  const email = norm(prospect.email);
  const linkedin = norm(prospect.linkedinUrl);
  const firm = norm(prospect.firmName);

  return contacts.some((contact) => {
    const cEmail = contact.email ? norm(contact.email) : "";
    const cUrl = contact.profileUrl ? norm(contact.profileUrl) : "";
    const cName = norm(contact.name);
    const cOrg = contact.org ? norm(contact.org) : "";

    if (email && cEmail && email === cEmail) return true;
    if (linkedin && cUrl && (cUrl === linkedin || cUrl.includes(linkedin) || linkedin.includes(cUrl)))
      return true;
    if (name && cName && (cName === name || cName.includes(name) || name.includes(cName))) return true;
    if (firm && (cOrg === firm || cName === firm)) return true;
    return false;
  });
}

export function prospectDuplicateIndexes(prospects: Prospect[], contacts: Contact[]) {
  return prospects
    .map((p, i) => (isDuplicateProspect(p, contacts) ? i : -1))
    .filter((i) => i >= 0);
}
