import { describe, expect, it } from "vitest";
import { LEGAL_INDIA_BLUEPRINT } from "./legal-india.fixture";
import {
  messageGroupsFromBlueprint,
  roleFromTitle,
  navigatorGuide,
  linkedinHashtagLine,
} from "./helpers";
import { blueprintSchema } from "./schema";

describe("LEGAL_INDIA_BLUEPRINT", () => {
  it("validates against schema", () => {
    expect(() => blueprintSchema.parse(LEGAL_INDIA_BLUEPRINT)).not.toThrow();
  });

  it("produces five message groups", () => {
    const groups = messageGroupsFromBlueprint(LEGAL_INDIA_BLUEPRINT);
    expect(groups).toHaveLength(5);
    expect(groups.map((g) => g.key)).toEqual([
      "advocate",
      "firm_cxo",
      "firm_partner",
      "firm_senior_associate",
      "firm_associate",
    ]);
  });

  it("maps titles to firm roles like before", () => {
    expect(roleFromTitle(LEGAL_INDIA_BLUEPRINT, "Managing Partner at Khaitan & Co")).toBe(
      "firm_cxo",
    );
    expect(roleFromTitle(LEGAL_INDIA_BLUEPRINT, "Senior Associate")).toBe("firm_senior_associate");
    expect(roleFromTitle(LEGAL_INDIA_BLUEPRINT, "Associate")).toBe("firm_associate");
  });

  it("has navigator guides for advocate and firm roles", () => {
    expect(navigatorGuide(LEGAL_INDIA_BLUEPRINT, "advocate").listName).toContain("Advocates");
    expect(navigatorGuide(LEGAL_INDIA_BLUEPRINT, "firm_partner").titleBoolean).toContain(
      "Partner",
    );
  });

  it("builds hashtag line with product slug", () => {
    expect(linkedinHashtagLine(LEGAL_INDIA_BLUEPRINT, "Knowlex")).toBe(
      "#legaltech #knowlex #AI",
    );
  });
});
