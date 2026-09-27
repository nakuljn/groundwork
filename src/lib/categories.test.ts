import { describe, expect, it } from "vitest";
import { firmRoleFromTitle, messageGroupKey } from "./categories";

describe("firmRoleFromTitle", () => {
  it.each([
    ["Managing Partner at Khaitan & Co", "firm_cxo"],
    ["Founding Partner", "firm_cxo"],
    ["Chief Operating Officer", "firm_cxo"],
    ["Head of Knowledge Management", "firm_cxo"],
    ["Partner - Corporate", "firm_partner"],
    ["Senior Partner, Disputes", "firm_partner"],
    ["Senior Associate", "firm_senior_associate"],
    ["Principal Associate | Litigation", "firm_senior_associate"],
    ["Associate", "firm_associate"],
    ["Advocate", "firm_partner"],
    [null, "firm_partner"],
  ])("%s → %s", (title, expected) => {
    expect(firmRoleFromTitle(title)).toBe(expected);
  });
});

describe("messageGroupKey", () => {
  it("keeps advocates on the advocate set", () => {
    expect(messageGroupKey({ category: "advocate", role: "Managing Partner" })).toBe("advocate");
  });

  it("routes firm contacts by title", () => {
    expect(messageGroupKey({ category: "firm", role: "Associate" })).toBe("firm_associate");
  });
});
