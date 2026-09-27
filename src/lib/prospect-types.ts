import { z } from "zod";

const str = z
  .string()
  .nullish()
  .transform((v) => v ?? "");

export const guideSchema = z.object({
  googleQueries: z.array(z.string()).min(1).max(6),
  salesNavigator: z.object({
    filters: z.array(z.object({ name: z.string(), value: z.string() })),
    steps: z.array(z.string()),
  }),
  linkedinSearch: z.object({
    booleanQuery: z.string(),
    steps: z.array(z.string()),
  }),
  tips: z.array(z.string()).default([]),
});

export const prospectSchema = z.object({
  firmName: str,
  personName: str,
  role: str,
  type: str,
  sizeEstimate: str,
  city: str,
  website: str,
  email: str,
  phone: str,
  linkedinUrl: str,
  whyFit: str,
  sourceUrl: str,
});

export const extractionSchema = z.object({
  prospects: z.array(prospectSchema),
});

export type SearchGuide = z.infer<typeof guideSchema>;
export type Prospect = z.infer<typeof prospectSchema>;
