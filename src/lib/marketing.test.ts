import { describe, expect, it } from "vitest";
import { startOfWeek } from "date-fns";
import {
  currentWeekStart,
  isMarketingReminderDue,
  marketingDraftIssues,
  shouldProtectMarketingPost,
} from "./marketing-shared";

describe("currentWeekStart", () => {
  it("starts weeks on Monday", () => {
    const monday = new Date("2026-09-21T12:00:00.000Z");
    const sunday = new Date("2026-09-27T12:00:00.000Z");
    expect(currentWeekStart(monday).getDay()).toBe(1);
    expect(currentWeekStart(sunday).getDay()).toBe(1);
    expect(currentWeekStart(sunday).getTime()).toBe(
      startOfWeek(sunday, { weekStartsOn: 1 }).getTime(),
    );
  });
});

describe("shouldProtectMarketingPost", () => {
  it("protects saved, ready, and posted posts", () => {
    expect(shouldProtectMarketingPost({ savedAt: new Date(), status: "draft" })).toBe(true);
    expect(shouldProtectMarketingPost({ savedAt: null, status: "ready" })).toBe(true);
    expect(shouldProtectMarketingPost({ savedAt: null, status: "posted" })).toBe(true);
    expect(shouldProtectMarketingPost({ savedAt: null, status: "draft" })).toBe(false);
  });
});

describe("isMarketingReminderDue", () => {
  const monday = new Date("2026-09-21T12:00:00.000Z");

  it("is due on or after the configured reminder day", () => {
    expect(
      isMarketingReminderDue({
        enabled: true,
        reminderDay: 1,
        timezone: "UTC",
        dismissedAt: null,
        posted: 0,
        target: 3,
        now: monday,
      }),
    ).toBe(true);
  });

  it("is not due when disabled, dismissed, or target met", () => {
    expect(
      isMarketingReminderDue({
        enabled: false,
        reminderDay: 1,
        timezone: "UTC",
        dismissedAt: null,
        posted: 0,
        target: 3,
        now: monday,
      }),
    ).toBe(false);
    expect(
      isMarketingReminderDue({
        enabled: true,
        reminderDay: 1,
        timezone: "UTC",
        dismissedAt: new Date(),
        posted: 0,
        target: 3,
        now: monday,
      }),
    ).toBe(false);
    expect(
      isMarketingReminderDue({
        enabled: true,
        reminderDay: 1,
        timezone: "UTC",
        dismissedAt: null,
        posted: 3,
        target: 3,
        now: monday,
      }),
    ).toBe(false);
  });
});

describe("marketingDraftIssues", () => {
  it("flags repeated hooks and bad LinkedIn formatting", () => {
    const issues = marketingDraftIssues(
      {
        storyline: "A connected week about legal drafting.",
        posts: [
          {
            role: "problem",
            title: "Problem",
            hook: "Same hook for both posts",
            body: "Second paragraph.\n\nThird paragraph.\n\n#one #two #three #four",
            imagePrompt: "Editorial visual of a legal desk with documents.",
          },
          {
            role: "insight",
            title: "Insight",
            hook: "Same hook for both posts",
            body: "Another useful idea.\n\nThird paragraph.",
            imagePrompt: "Minimal illustration of workflow clarity.",
          },
          {
            role: "product",
            title: "Product",
            hook: "Drafting should not eat your evenings",
            body: "Try the free trial.\n\nVisit the site.",
            imagePrompt: "Clean product-led editorial visual.",
          },
        ],
      },
      "Knowlex",
    );

    expect(issues.some((issue) => issue.includes("hook"))).toBe(true);
    expect(issues.some((issue) => issue.includes("hashtag"))).toBe(true);
    expect(issues.some((issue) => issue.includes("bold") || issue.includes("line breaks"))).toBe(true);
  });
});
