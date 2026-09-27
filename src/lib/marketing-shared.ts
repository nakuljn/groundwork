import { addDays, format, isBefore, isSameDay, startOfDay, startOfWeek } from "date-fns";
import type { MarketingPost } from "@/types/domain";
import { applyInlineBold, stripInlineBoldMarkers, unicodeStyle } from "./linkedin-format";

const BANNED = [
  "revolutionize",
  "game-changer",
  "cutting-edge",
  "in today's fast-paced world",
  "unlock the power",
  "elevate your",
  "ai-driven",
  "imagine this",
  "in the world of",
];

export type PostRole =
  | "problem"
  | "insight"
  | "product"
  | "tip"
  | "build"
  | "custom";

export type MarketingWeekDraft = {
  storyline: string;
  posts: Array<{
    role: PostRole;
    title: string;
    hook: string;
    body: string;
    imagePrompt: string;
  }>;
};

export type WeekSlotTiming = "past" | "today" | "upcoming";

export type WeekSlot = {
  sequence: number;
  role: PostRole;
  date: Date;
  weekday: number;
  timing: WeekSlotTiming;
};

export function currentWeekStart(date = new Date()) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/** ISO weekday 1=Mon … 7=Sun. Default cadence for posts per week. */
export function defaultPostingDays(count: number): number[] {
  const n = Math.min(5, Math.max(1, count));
  const presets: Record<number, number[]> = {
    1: [2],
    2: [2, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
  };
  return presets[n] ?? presets[2];
}

export function parsePostingDays(raw: string | null | undefined, weeklyTarget: number) {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      const days = parsed.filter((d): d is number => typeof d === "number" && d >= 1 && d <= 7);
      if (days.length > 0) return [...new Set(days)].sort((a, b) => a - b);
    }
  } catch {
    /* fall through */
  }
  return defaultPostingDays(weeklyTarget);
}

export function storyArc(count: number): PostRole[] {
  const n = Math.min(5, Math.max(1, count));
  if (n === 1) return ["insight"];
  if (n === 2) return ["problem", "product"];
  if (n === 3) return ["problem", "insight", "product"];
  if (n === 4) return ["problem", "insight", "tip", "product"];
  return ["problem", "insight", "tip", "build", "product"];
}

export function weekdayFromDate(date: Date, timezone: string) {
  try {
    const weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: timezone,
    }).format(date);
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(weekday) + 1;
  } catch {
    const js = date.getDay();
    return js === 0 ? 7 : js;
  }
}

function dateForWeekday(weekStart: Date, weekday: number) {
  return addDays(startOfDay(weekStart), weekday - 1);
}

export function weekSlots(
  weekStart: Date,
  postingDays: number[],
  timezone: string,
  today = new Date(),
): WeekSlot[] {
  const roles = storyArc(postingDays.length);
  const todayStart = startOfDay(today);

  return postingDays.map((weekday, index) => {
    const date = dateForWeekday(weekStart, weekday);
    let timing: WeekSlotTiming = "upcoming";
    if (isBefore(date, todayStart)) timing = "past";
    else if (isSameDay(date, todayStart)) timing = "today";

    return {
      sequence: index + 1,
      role: roles[index] ?? "insight",
      date,
      weekday,
      timing,
    };
  });
}

/** If no posting slots remain this week, plan for next week. */
export function planningWeekStart(today = new Date(), postingDays: number[], timezone: string) {
  const thisWeek = currentWeekStart(today);
  const slots = weekSlots(thisWeek, postingDays, timezone, today);
  const hasUpcoming = slots.some((s) => s.timing === "today" || s.timing === "upcoming");
  if (hasUpcoming) return thisWeek;
  return addDays(thisWeek, 7);
}

export function nextPostSlot(
  weekStart: Date,
  postingDays: number[],
  timezone: string,
  today = new Date(),
) {
  const slots = weekSlots(weekStart, postingDays, timezone, today);
  return (
    slots.find((s) => s.timing === "today") ??
    slots.find((s) => s.timing === "upcoming") ??
    null
  );
}

export function formatPostTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatSlotDate(date: Date) {
  return format(date, "EEE d MMM");
}

import type { Blueprint } from "./blueprint/schema";
import { linkedinHashtagLine as hashtagsFromBlueprint } from "./blueprint/helpers";

export function productHashtag(productName: string, fallback = "#product") {
  const slug = productName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  return slug ? `#${slug}` : fallback;
}

export function linkedinHashtagLine(blueprint: Blueprint, productName: string) {
  return hashtagsFromBlueprint(blueprint, productName);
}

export function linkedinBodyRules(blueprint: Blueprint, productName: string) {
  const hashtags = linkedinHashtagLine(blueprint, productName);
  return `LINKEDIN BODY FORMAT (mandatory — mobile-first, scannable):
- hook is returned separately; body must NOT repeat the hook
- One idea per line or short block (max 2 sentences). Never write a wall of text
- Wrap 2–4 key phrases in **double asterisks** (times, pain points, outcomes) — these become bold on LinkedIn
- Use • bullet lines for lists of 3+ items (breakage points, tools, steps)
- Blank line between blocks
- End with exactly this hashtag line on its own line: ${hashtags}
- Do NOT use any other hashtags
- 450–900 characters for the body (excluding hook)

Example shape (adapt content, do not copy verbatim):
${blueprint.content.linkedinExampleShape ?? "One concrete moment from the audience's day, then what breaks, then the insight."}

${hashtags}`;
}

export function postRoleMeta(role: string, productName?: string) {
  const product = productName ?? "your product";
  const map: Record<string, { label: string; eyebrow: string }> = {
    problem: { label: "The problem", eyebrow: "Open the story" },
    insight: { label: "The useful idea", eyebrow: "Build trust" },
    product: { label: `The ${product} angle`, eyebrow: "Invite action" },
    tip: { label: "Practical tip", eyebrow: "Give value" },
    build: { label: "Behind the build", eyebrow: "Show the work" },
    custom: { label: "Extra post", eyebrow: "Your idea" },
  };
  return map[role] ?? map.custom;
}

export const POST_ROLES = [
  { key: "problem", label: "The problem", eyebrow: "Open the story" },
  { key: "insight", label: "The useful idea", eyebrow: "Build trust" },
  { key: "product", label: "The product angle", eyebrow: "Invite action" },
  { key: "tip", label: "Practical tip", eyebrow: "Give value" },
  { key: "build", label: "Behind the build", eyebrow: "Show the work" },
] as const;

export function marketingDraftIssues(
  result: MarketingWeekDraft,
  blueprint: Blueprint,
  productName?: string,
) {
  const issues: string[] = [];
  const hooks = result.posts.map((post) => post.hook.toLowerCase().trim());
  if (new Set(hooks).size !== hooks.length) issues.push("Two posts share the same hook.");

  for (const post of result.posts) {
    const lower = `${post.hook}\n${post.body}`.toLowerCase();
    for (const phrase of BANNED) {
      if (lower.includes(phrase)) issues.push(`${post.role} uses generic phrase "${phrase}".`);
    }
    if (post.hook.length > 90) issues.push(`${post.role} hook is over 90 characters.`);
    if (post.hook.trim().endsWith("?")) {
      issues.push(`${post.role} hook must not be question-only.`);
    }
    if (/#[\p{L}\p{N}_]+/u.test(post.hook)) {
      issues.push(`${post.role} hook must not contain hashtags.`);
    }

    const paragraphs = post.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    for (const paragraph of paragraphs) {
      if (!paragraph.startsWith("#") && paragraph.length > 220) {
        issues.push(`${post.role} has a paragraph over 220 characters — break it up for LinkedIn.`);
      }
      const sentences = paragraph.split(/(?<=[.!?])\s+/).filter(Boolean);
      if (!paragraph.startsWith("•") && !paragraph.startsWith("#") && sentences.length > 2) {
        issues.push(`${post.role} stacks too many sentences in one block — use line breaks or bullets.`);
      }
    }

    const bulletLines = post.body.split("\n").filter((line) => /^\s*•\s/.test(line));
    if (post.body.length > 350 && bulletLines.length < 2) {
      issues.push(`${post.role} needs at least 2 bullet lines (•) for a scannable LinkedIn post.`);
    }

    const hashtags = post.body.match(/#[\p{L}\p{N}_]+/gu) ?? [];
    if (hashtags.length !== 3) {
      issues.push(`${post.role} must end with exactly 3 hashtags.`);
    }
    if (productName) {
      const expectedTags = linkedinHashtagLine(blueprint, productName)
        .toLowerCase()
        .split(/\s+/);
      const bodyTags = hashtags.join(" ").toLowerCase();
      for (const tag of expectedTags) {
        if (!bodyTags.includes(tag.replace("#", "")) && !bodyTags.includes(tag)) {
          issues.push(`${post.role} hashtags must include ${tag}.`);
        }
      }
    }

    if (post.body.split("\n").filter(Boolean).length < 4) {
      issues.push(`${post.role} needs more line breaks — LinkedIn posts are read on mobile.`);
    }
    if (!/\*\*[^*]+\*\*/.test(post.body)) {
      issues.push(`${post.role} must bold 2–4 key phrases in the body using **double asterisks**.`);
    }
  }
  return issues;
}

export function shouldProtectMarketingPost(
  post: Pick<MarketingPost, "savedAt" | "status">,
) {
  return Boolean(post.savedAt || ["ready", "posted"].includes(post.status));
}

export function slotStatus(
  post: Pick<MarketingPost, "status"> | null | undefined,
  slot: WeekSlot,
): "empty" | "draft" | "ready" | "posted" | "missed" | "skipped" {
  if (!post) return "empty";
  if (post.status === "posted") return "posted";
  if (post.status === "ready") return "ready";
  if (post.status === "skipped") return "skipped";
  if (slot.timing === "past") return "missed";
  return "draft";
}

export function isMarketingReminderDue(input: {
  enabled: boolean;
  reminderDay: number;
  timezone: string;
  dismissedAt: Date | null;
  posted: number;
  target: number;
  now?: Date;
}) {
  if (!input.enabled || input.dismissedAt || input.posted >= input.target) return false;
  let weekday: string;
  try {
    weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: input.timezone,
    }).format(input.now ?? new Date());
  } catch {
    weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
      input.now ?? new Date(),
    );
  }
  const isoDay = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(weekday) + 1;
  return isoDay >= input.reminderDay;
}

export function postImage(post: Pick<MarketingPost, "imagePath">) {
  return post.imagePath ? `/api/marketing-images/${encodeURIComponent(post.imagePath)}` : null;
}

export function composePostText(hook: string, body: string) {
  const trimmedHook = hook.trim();
  const trimmedBody = body.trim();
  const boldHook = unicodeStyle(trimmedHook, "bold");
  const plainBody = stripInlineBoldMarkers(trimmedBody);
  const formattedBody = applyInlineBold(trimmedBody);
  return {
    formattedText: `${boldHook}\n\n${formattedBody}`,
    plainText: `${trimmedHook}\n\n${plainBody}`,
    hook: trimmedHook,
  };
}
