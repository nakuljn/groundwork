import { describe, expect, it } from "vitest";
import {
  composePostText,
  defaultPostingDays,
  planningWeekStart,
  storyArc,
  weekSlots,
} from "./marketing-shared";
import { unicodeStyle } from "./linkedin-format";

describe("defaultPostingDays", () => {
  it.each([
    [1, [2]],
    [2, [2, 4]],
    [3, [1, 3, 5]],
    [4, [1, 2, 4, 5]],
    [5, [1, 2, 3, 4, 5]],
  ])("%i posts → %j", (count, expected) => {
    expect(defaultPostingDays(count)).toEqual(expected);
  });
});

describe("storyArc", () => {
  it("returns one insight post for cadence of 1", () => {
    expect(storyArc(1)).toEqual(["insight"]);
  });
  it("returns five roles for cadence of 5", () => {
    expect(storyArc(5)).toEqual(["problem", "insight", "tip", "build", "product"]);
  });
});

describe("weekSlots", () => {
  it("marks Tue/Thu as past when today is Sunday at end of the week", () => {
    const weekStart = new Date("2026-09-21T00:00:00");
    const today = new Date("2026-09-27T00:00:00");
    const slots = weekSlots(weekStart, [2, 4], "Asia/Kolkata", today);
    expect(slots).toHaveLength(2);
    expect(slots[0].timing).toBe("past");
    expect(slots[1].timing).toBe("past");
  });

  it("rolls planning to next week when no slots remain", () => {
    const today = new Date("2026-09-27T00:00:00");
    const next = planningWeekStart(today, [2, 4], "Asia/Kolkata");
    expect(next.getTime()).toBe(new Date("2026-09-28T00:00:00").getTime());
  });
});

describe("composePostText", () => {
  it("bolds the hook on the first line", () => {
    const { formattedText, plainText, hook } = composePostText(
      "Drafts should not eat your evenings",
      "Most advocates still rewrite the same paragraphs by hand.",
    );
    expect(hook).toBe("Drafts should not eat your evenings");
    expect(formattedText.startsWith(unicodeStyle("Drafts should not eat your evenings", "bold"))).toBe(
      true,
    );
    expect(plainText.startsWith("Drafts should not eat your evenings")).toBe(true);
  });

  it("converts **markers** in the body to unicode bold", () => {
    const { formattedText, plainText } = composePostText(
      "When eCourts PDFs meet filing deadlines",
      "**8:45am** — pull orders.\n\n#legaltech #knowlex #AI",
    );
    expect(formattedText).toContain(unicodeStyle("8:45am", "bold"));
    expect(plainText).toContain("8:45am");
    expect(plainText).not.toContain("**");
  });
});
