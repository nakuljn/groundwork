import type { Blueprint } from "../schema";
import { LEGAL_INDIA_BLUEPRINT } from "../legal-india.fixture";

export const JOBS_PLATFORM_BLUEPRINT: Blueprint = {
  id: "jobs-platform",
  version: 1,
  product: {
    name: "HireFlow",
    oneLiner: "Resume tailoring and interview practice for job seekers; hiring tools for companies.",
    locale: { currency: "USD", timezone: "America/New_York", country: "US", locale: "en-US" },
    proofPoints: [],
  },
  vocabulary: {
    org: "company",
    orgPlaceholder: "your company",
    person: "candidate",
    segmentGroupLabel: "Audience",
    individualSegmentLabel: "Job seekers",
    organizationSegmentLabel: "Companies hiring",
    targetOrgBarTitle: "Target company",
  },
  segments: [
    {
      key: "job_seeker",
      name: "Job seekers",
      description: "People actively applying or preparing for interviews.",
      kind: "individual",
      contactCategory: "job_seeker",
      messageGroupKey: "job_seeker",
      persona: {
        label: "job seeker",
        who: "A professional looking for their next role who spends hours tailoring resumes and preparing for interviews.",
        caresAbout: "Getting callbacks, sounding credible in interviews, and standing out without gaming the system.",
        ask: "Try it on their next application or mock interview.",
        tone: "Encouraging and practical, never condescending.",
        bannedAngles: [],
      },
      channelGuides: { salesNavigator: { titleBoolean: `"Job Seeker" OR "Open to work"`, listName: "Job seekers", filters: [] } },
    },
    {
      key: "company",
      name: "Companies",
      description: "Teams hiring through LinkedIn and referrals.",
      kind: "organization",
      contactCategory: "company",
      messageGroupKey: "company",
      channelGuides: {},
      roles: [
        {
          key: "company_founder",
          name: "Founder / CHRO",
          reader: "founder",
          description: "Decides hiring stack and budget.",
          approachOrder: 1,
          titlePatterns: ["founder", "ceo", "chro", "chief people"],
          persona: {
            label: "founder",
            who: "A startup founder or CHRO who owns hiring outcomes.",
            caresAbout: "Speed to hire, quality of candidates, and cost per hire.",
            ask: "A 15-minute walkthrough or pilot on one open role.",
            tone: "Senior and direct.",
            bannedAngles: [],
          },
          channelGuides: { salesNavigator: { titleBoolean: "Founder OR CHRO", listName: "Companies – leaders", filters: [] } },
        },
        {
          key: "company_recruiter",
          name: "Recruiter / TA",
          reader: "recruiter",
          description: "Runs pipelines day to day.",
          approachOrder: 2,
          titlePatterns: ["recruiter", "talent acquisition", "hiring manager"],
          persona: {
            label: "recruiter",
            who: "An in-house recruiter or TA lead managing reqs.",
            caresAbout: "Qualified applicants, less screening time, better interview signal.",
            ask: "Try it on one open req.",
            tone: "Operational and friendly.",
            bannedAngles: [],
          },
          channelGuides: { salesNavigator: { titleBoolean: "Recruiter OR Talent Acquisition", listName: "Companies – TA", filters: [] } },
        },
      ],
    },
  ],
  tracks: LEGAL_INDIA_BLUEPRINT.tracks.map((t) => ({
    ...t,
    summary: t.summary.replace(/law|legal|firm/gi, "hiring"),
  })),
  content: {
    pillars: ["job search", "interviews", "hiring"],
    voice: "Clear, practical, founder-led.",
    hashtags: ["#hiring", "#careers", "#AI"],
    industryHashtag: "#hiring",
    storyArc: ["problem", "insight", "product"],
    imageStyle: "Documentary photography of real workplaces and candidates.",
    audienceSummary: "Job seekers and hiring teams at growing companies.",
    writingDomain: "hiring technology founder",
    linkedinExampleShape: "**Monday** — you tailor the same resume bullet for the fifth time.\n\nBy **Wednesday** the callback still has not come.",
  },
  prospecting: {
    sources: ["company career pages", "job boards", "LinkedIn"],
    searchHints: ["Include role and city in each query"],
    sizeEstimateExamples: ["10-50 employees", "solo applicant"],
  },
  inferCategory: {
    individualSignals: ["solo", "individual", "job seeker"],
    organizationSignals: ["company", "startup", "10+", "50"],
  },
};

export const GENERIC_B2B_BLUEPRINT: Blueprint = {
  ...JOBS_PLATFORM_BLUEPRINT,
  id: "generic-b2b",
  product: { ...JOBS_PLATFORM_BLUEPRINT.product, name: "Acme SaaS" },
  vocabulary: {
    ...JOBS_PLATFORM_BLUEPRINT.vocabulary,
    individualSegmentLabel: "End users",
    organizationSegmentLabel: "Buyer organizations",
    org: "company",
  },
};

export const EVAL_FIXTURES = [
  { name: "legal-india", blueprint: LEGAL_INDIA_BLUEPRINT, mustNotInclude: [] },
  {
    name: "jobs-platform",
    blueprint: JOBS_PLATFORM_BLUEPRINT,
    mustNotInclude: ["advocate", "law firm", "eCourts", "chamber"],
  },
  {
    name: "generic-b2b",
    blueprint: GENERIC_B2B_BLUEPRINT,
    mustNotInclude: ["advocate", "law firm"],
  },
] as const;
