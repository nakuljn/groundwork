import { describe, expect, it } from "vitest";
import { blueprintSchema } from "../schema";
import { messageGroupsFromBlueprint } from "../helpers";
import { EVAL_FIXTURES } from "./fixtures";

describe("blueprint eval fixtures", () => {
  for (const fixture of EVAL_FIXTURES) {
    it(`${fixture.name} validates against schema`, () => {
      expect(() => blueprintSchema.parse(fixture.blueprint)).not.toThrow();
    });

    it(`${fixture.name} has message groups and no forbidden terms`, () => {
      const groups = messageGroupsFromBlueprint(fixture.blueprint);
      expect(groups.length).toBeGreaterThan(0);
      const blob = JSON.stringify(fixture.blueprint).toLowerCase();
      for (const term of fixture.mustNotInclude) {
        expect(blob.includes(term.toLowerCase())).toBe(false);
      }
    });
  }
});

describe("Knowlex regression snapshot", () => {
  it("keeps five legal message groups", () => {
    const legal = EVAL_FIXTURES.find((f) => f.name === "legal-india")!.blueprint;
    expect(messageGroupsFromBlueprint(legal).map((g) => g.key)).toEqual([
      "advocate",
      "firm_cxo",
      "firm_partner",
      "firm_senior_associate",
      "firm_associate",
    ]);
  });
});
