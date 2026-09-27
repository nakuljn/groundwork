export const CHANNELS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "google", label: "Google" },
  { value: "instagram_fb", label: "Instagram / FB" },
  { value: "email", label: "Email" },
  { value: "offline", label: "Offline" },
  { value: "other", label: "Other" },
] as const;

export const ACTIVITY_TYPES = [
  { value: "linkedin_outreach", label: "LinkedIn outreach" },
  { value: "cold_email", label: "Cold email" },
  { value: "post", label: "Post" },
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "ad_campaign", label: "Ad campaign" },
  { value: "purchase", label: "Purchase (tool, subscription, event)" },
  { value: "other", label: "Other" },
] as const;

export const CONTACT_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "meeting", label: "Meeting" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
] as const;

export type Channel = (typeof CHANNELS)[number]["value"];
export type ActivityType = (typeof ACTIVITY_TYPES)[number]["value"];
export type ContactStatus = (typeof CONTACT_STATUSES)[number]["value"];

