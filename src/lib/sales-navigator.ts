export type NavigatorFilter = {
  filter: string;
  select: string;
  why: string;
};

export type NavigatorGuide = {
  filters: NavigatorFilter[];
  titleBoolean: string;
  listName: string;
};

const ACTIVE_FILTER: NavigatorFilter = {
  filter: "Posted on LinkedIn",
  select: "Posted on LinkedIn in past 30 days",
  why: "People who post recently actually open LinkedIn, so they see and answer messages.",
};

const CONNECTION_FILTER: NavigatorFilter = {
  filter: "Connection",
  select: "2nd degree connections first, then 3rd+",
  why: "2nd-degree people accept invites far more often. Use 3rd+ for InMail.",
};

const FIRM_GEOGRAPHY: NavigatorFilter = {
  filter: "Geography",
  select: "One city to start (e.g. Delhi, Mumbai, Bengaluru), then widen to India",
  why: "Most firms cluster in a few metros; one city keeps the list focused.",
};

const FIRM_INDUSTRY: NavigatorFilter = {
  filter: "Industry",
  select: "Law Practice",
  why: "Law firms, not legal departments inside other companies.",
};

const FIRM_HEADCOUNT: NavigatorFilter = {
  filter: "Company headcount",
  select: "11-50, 51-200, 201-500",
  why: "Firms big enough to have partners, senior associates and associates working together.",
};

const TITLE_FILTER: NavigatorFilter = {
  filter: "Current job title",
  select: "Paste the title search below",
  why: "Seniority alone is loose for law firms; the title search pins down the exact role.",
};

const LEGAL_FUNCTION: NavigatorFilter = {
  filter: "Function",
  select: "Legal",
  why: "Filters out admin, HR and marketing staff at the same firms.",
};

const FIRM_TIP: NavigatorFilter = {
  filter: "Tip",
  select: "Search the firm first in Account search, save it, then run this lead search with Current company set to your saved accounts",
  why: "Lets you work through every role at the same firms instead of scattered people.",
};

const GUIDES: Record<string, NavigatorGuide> = {
  firm_cxo: {
    titleBoolean: `"Managing Partner" OR "Founding Partner" OR "Name Partner" OR Founder OR "Chief Operating Officer" OR COO OR CTO OR "Head of Knowledge Management" OR "Head of Innovation"`,
    listName: "Firms – <city> – Leadership",
    filters: [
      FIRM_GEOGRAPHY,
      FIRM_INDUSTRY,
      FIRM_HEADCOUNT,
      {
        filter: "Seniority level",
        select: "Owner / Partner, CXO",
        why: "Managing partners and firm leaders sit here.",
      },
      TITLE_FILTER,
      {
        filter: "Function",
        select: "Leave empty",
        why: "COOs, CTOs and knowledge heads are not tagged Legal, so this filter would drop them.",
      },
      FIRM_TIP,
      CONNECTION_FILTER,
      ACTIVE_FILTER,
    ],
  },
  firm_partner: {
    titleBoolean: `(Partner OR "Senior Partner" OR "Equity Partner" OR "Practice Head") NOT "Managing Partner" NOT "Founding Partner"`,
    listName: "Firms – <city> – Partners",
    filters: [
      FIRM_GEOGRAPHY,
      FIRM_INDUSTRY,
      FIRM_HEADCOUNT,
      {
        filter: "Seniority level",
        select: "Owner / Partner",
        why: "Partners decide what their practice group uses.",
      },
      TITLE_FILTER,
      LEGAL_FUNCTION,
      FIRM_TIP,
      CONNECTION_FILTER,
      ACTIVE_FILTER,
    ],
  },
  firm_senior_associate: {
    titleBoolean: `"Senior Associate" OR "Principal Associate" OR "Managing Associate"`,
    listName: "Firms – <city> – Senior associates",
    filters: [
      FIRM_GEOGRAPHY,
      FIRM_INDUSTRY,
      FIRM_HEADCOUNT,
      {
        filter: "Seniority level",
        select: "Senior, Experienced Manager",
        why: "LinkedIn tags senior associates inconsistently; these two cover most of them.",
      },
      TITLE_FILTER,
      {
        filter: "Years of experience",
        select: "3 to 5 years, 6 to 10 years",
        why: "Matches the usual senior associate band.",
      },
      LEGAL_FUNCTION,
      CONNECTION_FILTER,
      ACTIVE_FILTER,
    ],
  },
  firm_associate: {
    titleBoolean: `Associate NOT "Senior Associate" NOT "Principal Associate" NOT "Managing Associate" NOT Partner`,
    listName: "Firms – <city> – Associates",
    filters: [
      FIRM_GEOGRAPHY,
      FIRM_INDUSTRY,
      FIRM_HEADCOUNT,
      {
        filter: "Seniority level",
        select: "Entry Level, Senior",
        why: "Junior associates are usually tagged Entry Level; some show as Senior.",
      },
      TITLE_FILTER,
      {
        filter: "Years of experience",
        select: "1 to 2 years, 3 to 5 years",
        why: "Skips interns and trainees who cannot try tools on real matters.",
      },
      LEGAL_FUNCTION,
      CONNECTION_FILTER,
      ACTIVE_FILTER,
    ],
  },
  advocate: {
    titleBoolean: `Advocate OR Lawyer OR "Legal Consultant" OR "Practising Advocate"`,
    listName: "Advocates – <city>",
    filters: [
      {
        filter: "Geography",
        select: "One city to start (e.g. Delhi, Mumbai, Bengaluru), then widen to India",
        why: "A small city list is easier to work through and lets you mention the local court if they reply.",
      },
      {
        filter: "Industry",
        select: "Law Practice, Legal Services",
        why: "Removes in-house teams at non-legal companies.",
      },
      {
        filter: "Current job title",
        select: "Paste the title search below",
        why: "Indian advocates list themselves under several titles; this catches the common ones.",
      },
      {
        filter: "Company headcount",
        select: "Self-employed, 1-10",
        why: "Keeps the list to solo practitioners and small chambers, the Advocates group.",
      },
      {
        filter: "Years of experience",
        select: "3 to 5 years, 6 to 10 years, More than 10 years",
        why: "Skips students and interns who don't run their own matters.",
      },
      CONNECTION_FILTER,
      ACTIVE_FILTER,
    ],
  },
};

export function navigatorGuide(categoryKey: string): NavigatorGuide {
  if (GUIDES[categoryKey]) return GUIDES[categoryKey];
  return categoryKey.startsWith("firm") ? GUIDES.firm_partner : GUIDES.advocate;
}

/** How to work through one firm, top down. Shown above the firm role message sets. */
export const FIRM_SEQUENCE = [
  "Start at the top: the managing partner or CXO decides what the whole firm uses, so a yes there opens every other door.",
  "Two or three days later, write to one or two partners who run the practice groups most likely to use it.",
  "Then a senior associate in those groups: they feel the drafting load and can show it to their partner.",
  "Last, associates: they do the most first drafts and are the quickest to try something that saves them time.",
  "Space messages to the same firm 2–3 days apart, and never mention that you wrote to their colleagues.",
  "As soon as anyone at the firm replies, pause the rest and ask that person who else should see it.",
];

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
