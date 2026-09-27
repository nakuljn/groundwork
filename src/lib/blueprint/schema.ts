import { z } from "zod";

export const personaSchema = z.object({
  label: z.string().min(1),
  who: z.string().min(10),
  caresAbout: z.string().min(10),
  ask: z.string().min(5),
  tone: z.string().min(5),
  bannedAngles: z.array(z.string()).default([]),
});

export const navigatorFilterSchema = z.object({
  filter: z.string(),
  select: z.string(),
  why: z.string(),
});

export const navigatorGuideSchema = z.object({
  titleBoolean: z.string(),
  listName: z.string(),
  filters: z.array(navigatorFilterSchema),
});

export const segmentRoleSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  reader: z.string().min(1),
  description: z.string().min(1),
  approachOrder: z.number().int().min(0),
  titlePatterns: z.array(z.string()).min(1),
  persona: personaSchema,
  channelGuides: z
    .object({
      salesNavigator: navigatorGuideSchema.optional(),
    })
    .default({}),
});

export const segmentSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  kind: z.enum(["individual", "organization"]),
  contactCategory: z.string().min(1),
  messageGroupKey: z.string().min(1),
  persona: personaSchema.optional(),
  roles: z.array(segmentRoleSchema).optional(),
  channelGuides: z
    .object({
      salesNavigator: navigatorGuideSchema.optional(),
      communities: z.array(z.string()).optional(),
      directories: z.array(z.string()).optional(),
    })
    .default({}),
  orgApproachSequence: z.array(z.string()).optional(),
});

export const trackAgentSchema = z.enum(["find_prospects", "draft_messages"]);

export const trackTemplateSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  channel: z.string().min(1),
  activityType: z.string().min(1),
  goal: z.string().min(1),
  summary: z.string().min(1),
  skeleton: z.array(z.string()).min(4),
  stepAgents: z.record(z.string(), trackAgentSchema).default({}),
  agentInstructions: z
    .object({
      find_prospects: z.string().optional(),
      draft_messages: z.string().optional(),
    })
    .default({}),
});

export const contentConfigSchema = z.object({
  pillars: z.array(z.string()).default([]),
  voice: z.string().default("Clear, practical, credible, founder-led."),
  hashtags: z.array(z.string()).min(1),
  industryHashtag: z.string().optional(),
  storyArc: z.array(z.string()).default(["problem", "insight", "product"]),
  imageStyle: z
    .string()
    .default("Documentary-style photography, natural light, realistic textures — not illustrated."),
  linkedinExampleShape: z.string().optional(),
  audienceSummary: z.string().min(10),
  writingDomain: z.string().min(3),
});

export const prospectingConfigSchema = z.object({
  sources: z.array(z.string()).default([]),
  searchHints: z.array(z.string()).default([]),
  sizeEstimateExamples: z.array(z.string()).default([]),
});

export const vocabularySchema = z.object({
  org: z.string().default("organization"),
  orgPlaceholder: z.string().default("your organization"),
  person: z.string().default("contact"),
  segmentGroupLabel: z.string().default("Audience"),
  individualSegmentLabel: z.string().default("Individuals"),
  organizationSegmentLabel: z.string().default("Organizations"),
  targetOrgBarTitle: z.string().default("Target organization"),
});

export const localeSchema = z.object({
  currency: z.string().default("INR"),
  timezone: z.string().default("Asia/Kolkata"),
  country: z.string().default("IN"),
  locale: z.string().default("en-IN"),
});

export const blueprintSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().min(1).default(1),
  product: z.object({
    name: z.string().default(""),
    oneLiner: z.string().optional(),
    offer: z.string().optional(),
    proofPoints: z.array(z.string()).default([]),
    locale: localeSchema,
  }),
  vocabulary: vocabularySchema,
  segments: z.array(segmentSchema).min(1),
  tracks: z.array(trackTemplateSchema).min(1),
  content: contentConfigSchema,
  prospecting: prospectingConfigSchema.default({
    sources: [],
    searchHints: [],
    sizeEstimateExamples: [],
  }),
  inferCategory: z
    .object({
      individualSignals: z.array(z.string()).default(["solo", "individual", "1-2"]),
      organizationSignals: z.array(z.string()).default(["firm", "company", "10+", "50"]),
    })
    .default({
      individualSignals: ["solo", "individual", "1-2"],
      organizationSignals: ["firm", "company", "10+", "50"],
    }),
});

export type Persona = z.infer<typeof personaSchema>;
export type NavigatorFilter = z.infer<typeof navigatorFilterSchema>;
export type NavigatorGuide = z.infer<typeof navigatorGuideSchema>;
export type SegmentRole = z.infer<typeof segmentRoleSchema>;
export type Segment = z.infer<typeof segmentSchema>;
export type TrackTemplate = z.infer<typeof trackTemplateSchema>;
export type TrackAgent = z.infer<typeof trackAgentSchema>;
export type ContentConfig = z.infer<typeof contentConfigSchema>;
export type Vocabulary = z.infer<typeof vocabularySchema>;
export type Blueprint = z.infer<typeof blueprintSchema>;

export type MessageGroup = {
  key: string;
  name: string;
  description: string;
  segmentKey: string;
  kind: "individual" | "organization";
};
