import type { Blueprint } from "@/lib/blueprint/schema";
import type { NavigatorFilter, NavigatorGuide } from "@/lib/blueprint/schema";
import { navigatorGuide as guideFor, orgApproachSequence } from "@/lib/blueprint/helpers";
import { LEGAL_INDIA_BLUEPRINT } from "@/lib/blueprint/legal-india.fixture";

export type { NavigatorFilter, NavigatorGuide };

export function navigatorGuide(blueprint: Blueprint, categoryKey: string): NavigatorGuide {
  return guideFor(blueprint, categoryKey);
}

/** @deprecated pass blueprint */
export function navigatorGuideLegacy(categoryKey: string): NavigatorGuide {
  return guideFor(LEGAL_INDIA_BLUEPRINT, categoryKey);
}

export function firmSequence(blueprint: Blueprint): string[] {
  return orgApproachSequence(blueprint);
}

/** @deprecated use firmSequence(blueprint) */
export const FIRM_SEQUENCE = orgApproachSequence(LEGAL_INDIA_BLUEPRINT);

export const MESSAGE_BY_DEGREE = [
  {
    degree: "1st degree",
    use: "Message after they accept",
    note: "Already connected: message directly, no invite needed.",
  },
  {
    degree: "2nd degree",
    use: "Connection request note",
    note: "Send the invite with the note. Once they accept, send the message after they accept.",
  },
  {
    degree: "3rd degree / best-fit leads",
    use: "Sales Navigator InMail",
    note: "Uses one InMail credit. If their profile says Open Profile, the InMail is free.",
  },
  {
    degree: "No reply after 4–5 days",
    use: "LinkedIn follow-up",
    note: "Reply once in the same thread. Don't follow up more than once.",
  },
];

export const NAVIGATOR_ROUTINE = [
  "Save the search (top right, Save search) so Sales Navigator alerts you to new matches.",
  "Send about 15–20 invites a day. LinkedIn limits weekly invites, and a steady pace keeps your account safe.",
  "Withdraw invites that are still pending after 2–3 weeks; too many pending invites can restrict you.",
];
