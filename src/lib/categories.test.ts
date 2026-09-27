import { describe, expect, it } from "vitest";
import { firmRoleFromTitle, messageGroupKey } from "./categories";
import { LEGAL_INDIA_BLUEPRINT } from "./blueprint/legal-india.fixture";
import { orgContactCategory } from "./categories";

const bp = LEGAL_INDIA_BLUEPRINT;
const firmCategory = orgContactCategory(bp);

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
    expect(messageGroupKey(bp, { category: "advocate", role: "Managing Partner" })).toBe("advocate");
  });

  it("routes firm contacts by title", () => {
    expect(messageGroupKey(bp, { category: firmCategory, role: "Associate" })).toBe(
      "firm_associate",
    );
  });
});
