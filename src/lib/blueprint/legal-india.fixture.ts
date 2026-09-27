import type { Blueprint } from "./schema";

const ACTIVE_FILTER = {
  filter: "Posted on LinkedIn",
  select: "Posted on LinkedIn in past 30 days",
  why: "People who post recently actually open LinkedIn, so they see and answer messages.",
};

const CONNECTION_FILTER = {
  filter: "Connection",
  select: "2nd degree connections first, then 3rd+",
  why: "2nd-degree people accept invites far more often. Use 3rd+ for InMail.",
};

const FIRM_GEOGRAPHY = {
  filter: "Geography",
  select: "One city to start (e.g. Delhi, Mumbai, Bengaluru), then widen to India",
  why: "Most firms cluster in a few metros; one city keeps the list focused.",
};

const FIRM_INDUSTRY = {
  filter: "Industry",
  select: "Law Practice",
  why: "Law firms, not legal departments inside other companies.",
};

const FIRM_HEADCOUNT = {
  filter: "Company headcount",
  select: "11-50, 51-200, 201-500",
  why: "Firms big enough to have partners, senior associates and associates working together.",
};

const TITLE_FILTER = {
  filter: "Current job title",
  select: "Paste the title search below",
  why: "Seniority alone is loose for law firms; the title search pins down the exact role.",
};

const LEGAL_FUNCTION = {
  filter: "Function",
  select: "Legal",
  why: "Filters out admin, HR and marketing staff at the same firms.",
};

const FIRM_TIP = {
  filter: "Tip",
  select:
    "Search the firm first in Account search, save it, then run this lead search with Current company set to your saved accounts",
  why: "Lets you work through every role at the same firms instead of scattered people.",
};

/** Default blueprint for Indian legal-tech (Knowlex). Preserves pre-generic behaviour. */
export const LEGAL_INDIA_BLUEPRINT: Blueprint = {
  id: "legal-india",
  version: 1,
  product: {
    name: "Knowlex",
    locale: { currency: "INR", timezone: "Asia/Kolkata", country: "IN", locale: "en-IN" },
    proofPoints: [],
  },
  vocabulary: {
    org: "firm",
    orgPlaceholder: "your firm",
    person: "advocate",
    segmentGroupLabel: "Audience",
    individualSegmentLabel: "Individual advocates",
    organizationSegmentLabel: "Firms, by who you are writing to",
    targetOrgBarTitle: "Target firm",
  },
  segments: [
    {
      key: "advocate",
      name: "Advocates",
      description: "Solo practitioners and small chambers — individual decision-makers.",
      kind: "individual",
      contactCategory: "advocate",
      messageGroupKey: "advocate",
      persona: {
        label: "advocate",
        who: "An individual advocate: a solo practitioner or someone running a small chamber. They draft, translate and track their own matters, often between hearings, and read LinkedIn on their phone.",
        caresAbout:
          "Hours back in their own week, fewer late nights on drafting and translation, getting it right in front of the court and the client, and cost.",
        ask: "Try it themselves on their next real draft or matter.",
        tone: "One practitioner to another. Respectful, plain, never salesy. Talk about their day, not about a team.",
        bannedAngles: [],
      },
      channelGuides: {
        salesNavigator: {
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
            TITLE_FILTER,
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
      },
    },
    {
      key: "firm",
      name: "Firms",
      description: "Mid-size and large law firms, corporate practices, multi-lawyer chambers.",
      kind: "organization",
      contactCategory: "firm",
      messageGroupKey: "firm",
      channelGuides: {},
      orgApproachSequence: [
        "Start at the top: the managing partner or CXO decides what the whole firm uses, so a yes there opens every other door.",
        "Two or three days later, write to one or two partners who run the practice groups most likely to use it.",
        "Then a senior associate in those groups: they feel the drafting load and can show it to their partner.",
        "Last, associates: they do the most first drafts and are the quickest to try something that saves them time.",
        "Space messages to the same firm 2–3 days apart, and never mention that you wrote to their colleagues.",
        "As soon as anyone at the firm replies, pause the rest and ask that person who else should see it.",
      ],
      roles: [
        {
          key: "firm_cxo",
          name: "Managing Partner / CXO",
          reader: "managing partner",
          description:
            "Managing or founding partner, COO, CTO, head of knowledge or innovation. Decides what the whole firm uses.",
          approachOrder: 1,
          titlePatterns: [
            "managing partner",
            "founding partner",
            "name partner",
            "founder",
            "co-founder",
            "chairman",
            "chief",
            "ceo",
            "coo",
            "cto",
            "cfo",
            "cio",
            "cko",
            "head of knowledge",
            "head of innovation",
            "head of operations",
            "head of technology",
            "head of legal ops",
          ],
          persona: {
            label: "managing partner",
            who: "The managing or founding partner of a law firm, or a firm leader such as the COO, CTO or head of knowledge management. They decide which tools the whole firm uses.",
            caresAbout:
              "Consistent quality across many lawyers, client turnaround, taking on more work without adding headcount, confidentiality of client documents, and whether lawyers will actually adopt a new tool. Not the mechanics of one draft.",
            ask: "A 15–20 minute walkthrough, or a small pilot with one team at the firm.",
            tone: "Senior to senior. The shortest and most direct of all the sets. No flattery, no detail they would delegate. Talk about the firm, using {org}.",
            bannedAngles: [],
          },
          channelGuides: {
            salesNavigator: {
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
          },
        },
        {
          key: "firm_partner",
          name: "Partner",
          reader: "partner",
          description: "Runs a practice group or a set of client matters. Decides what their team uses.",
          approachOrder: 2,
          titlePatterns: ["partner", "senior partner", "equity partner", "practice head"],
          persona: {
            label: "partner",
            who: "A partner at a law firm who runs a practice group or a book of client matters, with associates working under them.",
            caresAbout:
              "Turnaround on client work, the time they spend reviewing and correcting juniors' drafts, keeping quality consistent across their team, and handling peak workload.",
            ask: "Try it on one live matter with their team, or a short walkthrough.",
            tone: "Direct and practical. Talk about their team and their matters, not the whole firm.",
            bannedAngles: ["managing partner", "founding partner"],
          },
          channelGuides: {
            salesNavigator: {
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
          },
        },
        {
          key: "firm_senior_associate",
          name: "Senior Associate",
          reader: "senior associate",
          description:
            "Runs matters day to day, reviews juniors' drafts. The person who brings a tool to the partner.",
          approachOrder: 3,
          titlePatterns: ["senior associate", "principal associate", "managing associate"],
          persona: {
            label: "senior associate",
            who: "A senior associate at a law firm. They run matters day to day, still draft heavily, and are the first reviewer of juniors' work before it reaches the partner.",
            caresAbout:
              "Faster first drafts and translations, less rework when reviewing juniors, meeting partners' deadlines, and being the person who finds a tool that makes the team better.",
            ask: "Try it themselves on their next draft; if it helps, they can show it to their partner. Never ask them to buy it or decide for the firm.",
            tone: "Collegial, peer to peer. Acknowledge the pressure of their role without being dramatic.",
            bannedAngles: [],
          },
          channelGuides: {
            salesNavigator: {
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
          },
        },
        {
          key: "firm_associate",
          name: "Associate",
          reader: "associate",
          description: "Does most first drafts, translations and research. The heaviest daily user.",
          approachOrder: 4,
          titlePatterns: ["associate"],
          persona: {
            label: "associate",
            who: "A junior associate at a law firm (roughly 1–4 years). They do most of the first drafts, translations, research and case-file preparation, often late at night.",
            caresAbout:
              "Getting first drafts done faster and right the first time, fewer late nights, and handing in work that holds up in review.",
            ask: "Try it free on their next draft. No demo request, no talk of buying or firm decisions.",
            tone: "Friendly and informal-professional, like an older colleague. The lightest messages of all the sets.",
            bannedAngles: ["senior associate", "principal associate", "managing associate", "partner"],
          },
          channelGuides: {
            salesNavigator: {
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
          },
        },
      ],
    },
  ],
  tracks: [
    {
      key: "linkedin_sales",
      name: "LinkedIn sales",
      channel: "linkedin",
      activityType: "linkedin_outreach",
      goal: "Book demos with decision-makers through direct LinkedIn outreach.",
      summary:
        "The core sales track. Find the right people, connect, message, follow up and book demos.",
      skeleton: [
        "Make your LinkedIn profile read like the product's front door (headline, about, featured)",
        "Build your first list of 20-30 prospects — Groundwork will search and reason about who fits",
        "Write a personal connection note for each prospect on your list",
        "Send the first batch of connection requests (15-20 a day, under the weekly limit)",
        "Message everyone who accepted with a short, specific opener and a demo or trial offer",
        "Follow up with people who read but did not reply, 3-4 days later",
        "Run demos, then ask each person for feedback and one referral",
        "Review what worked (acceptance and reply rate) and rewrite the note for the next batch",
      ],
      stepAgents: { "2": "find_prospects", "3": "draft_messages" },
      agentInstructions: {
        find_prospects:
          "Click Find prospects. Groundwork searches the web, skips people already on your list, and shows who fits.",
        draft_messages:
          "Draft LinkedIn messages for each audience segment and role. Copy the set that matches who you are writing to.",
      },
    },
    {
      key: "cold_email",
      name: "Cold email",
      channel: "email",
      activityType: "cold_email",
      goal: "Start conversations by email with organizations that publish contact details.",
      summary: "For prospects with public emails: websites, directories, association lists.",
      skeleton: [
        "Set up a sending address and signature that looks professional (not a free Gmail if avoidable)",
        "Build a list of 30 prospects with public emails — Groundwork will search for them",
        "Write a personal cold email for each prospect on your list",
        "Send the first 10-15 emails by hand and log them",
        "Send follow-ups to non-repliers after 3-4 days",
        "Reply fast to everyone who answers and offer a short demo",
        "Review open and reply rates and rewrite the subject line and first sentence",
      ],
      stepAgents: { "2": "find_prospects", "3": "draft_messages" },
      agentInstructions: {
        draft_messages: "Draft email templates for each audience segment.",
      },
    },
    {
      key: "linkedin_content",
      name: "LinkedIn content",
      channel: "linkedin",
      activityType: "post",
      goal: "Build credibility so people accept requests and reply to outreach.",
      summary: "Slow-burn trust. Posts that show the product solving a real problem for the audience.",
      skeleton: [
        "Pick 3 topics the audience cares about that the product has a strong answer to",
        "Write and publish a first post: the problem you saw and why you built the product",
        "Publish a short demo post (screen recording or before/after)",
        "Comment thoughtfully on 10 posts from people in your target audience",
        "Publish a post with a concrete tip or result the audience can use today",
        "Message people who engaged with your posts and offer a demo",
        "Review which post got the most reach and plan the next three like it",
      ],
      stepAgents: {},
      agentInstructions: {},
    },
    {
      key: "community",
      name: "Communities and referrals",
      channel: "offline",
      activityType: "other",
      goal: "Get introduced through groups, associations and the people you already know.",
      summary: "Warm intros convert best. Use groups, associations, events and friends.",
      skeleton: [
        "List 10 people you know who are in or close to the target audience",
        "Message each one personally asking for feedback, not a sale",
        "Find 3 communities where the audience gathers (associations, groups, forums)",
        "Join them and contribute something useful before mentioning the product",
        "Share a short, helpful post in each community with an offer to try the product",
        "Ask every happy user for one introduction to a peer",
        "Review which source brought real users and double down on it",
      ],
      stepAgents: {},
      agentInstructions: {},
    },
  ],
  content: {
    pillars: ["practice efficiency", "drafting", "court workflows"],
    voice: "Clear, practical, credible, founder-led.",
    hashtags: ["#legaltech", "#AI"],
    industryHashtag: "#legaltech",
    storyArc: ["problem", "insight", "product"],
    imageStyle:
      "Documentary-style photography, natural light, realistic textures, credible and professional — not illustrated or templated.",
    audienceSummary: `You write for Indian legal professionals.
- Individual advocates (solo practitioners, small chambers)
- People at law firms, by role: Managing Partner/CXO, Partner, Senior Associate, Associate`,
    writingDomain: "legal technology founder in India",
    linkedinExampleShape: `**8:45am** — pull fresh orders from eCourts. PDFs don't copy cleanly.

By 11:00am the draft looks fine on screen. Then the layout shifts in the chamber template.

What breaks:
• headings jump
• tables break
• fonts need normalising before filing

None of this is **everyday practice** made slow by tools that don't understand court-specific layouts.`,
  },
  prospecting: {
    sources: ["bar association lists", "firm websites", "legal directories"],
    searchHints: ["Include the location in each query"],
    sizeEstimateExamples: ["2-10 lawyers", "solo", "11-50"],
  },
  inferCategory: {
    individualSignals: ["solo", "individual", "1-2"],
    organizationSignals: ["firm", "company", "10+", "50"],
  },
};
