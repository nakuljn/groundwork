/** Client-safe domain types — keep in sync with db/schema.ts */

export type Product = {
  id: number;
  name: string;
  oneLiner: string | null;
  audience: string | null;
  offer: string | null;
  goal: string | null;
  websiteUrl: string | null;
  repoPath: string | null;
  brief: string | null;
  senderName: string | null;
  senderTitle: string | null;
  senderContact: string | null;
  createdAt: Date;
};

export type Contact = {
  id: number;
  productId: number;
  name: string;
  role: string | null;
  org: string | null;
  city: string | null;
  profileUrl: string | null;
  email: string | null;
  notes: string | null;
  sourceChannel: string;
  category: string;
  status: string;
  lastContactedAt: Date | null;
  createdAt: Date;
};

export type OutreachCategory = {
  id: number;
  productId: number;
  key: string;
  name: string;
  description: string | null;
  linkedinNote: string | null;
  coldEmail: string | null;
  followUp: string | null;
  linkedinMessage: string | null;
  inmail: string | null;
  linkedinFollowUp: string | null;
  savedFields: string;
  updatedAt: Date;
};

export type Track = {
  id: number;
  productId: number;
  key: string;
  name: string;
  channel: string;
  goal: string;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
};

export type TrackStep = {
  id: number;
  trackId: number;
  position: number;
  title: string;
  why: string;
  instructions: string;
  assetText: string | null;
  toolSuggestion: string | null;
  agent: string | null;
  status: string;
  doneAt: Date | null;
};

export type MarketingSettings = {
  id: number;
  productId: number;
  reminderEnabled: boolean;
  reminderDay: number;
  timezone: string;
  weeklyTarget: number;
  postingDays: string;
  postTime: string;
  pastPosts: string | null;
  voiceGuidance: string | null;
  imageStyle: string | null;
  reminderEmail: string | null;
  emailReminderEnabled: boolean;
  updatedAt: Date;
};

export type ContentWeek = {
  id: number;
  productId: number;
  weekStart: Date;
  topic: string | null;
  storyline: string | null;
  status: string;
  reminderDismissedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MarketingPost = {
  id: number;
  contentWeekId: number;
  sequence: number;
  role: string;
  title: string | null;
  hook: string | null;
  scheduledFor: Date | null;
  plainText: string;
  formattedText: string;
  imagePrompt: string | null;
  imagePath: string | null;
  status: string;
  savedAt: Date | null;
  postedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ContentWeekWithPosts = ContentWeek & {
  posts: MarketingPost[];
};
