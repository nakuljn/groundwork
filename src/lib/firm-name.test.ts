import { describe, expect, it } from "vitest";
import { applyFirmToText, applyFirmToTemplates, fillTemplatePlaceholders } from "./firm-name";

describe("applyFirmToText", () => {
  it("replaces {org} with the target firm", () => {
    expect(applyFirmToText("We work with {org} on drafting.", "Khaitan & Co")).toBe(
      "We work with Khaitan & Co on drafting.",
    );
  });

  it("replaces a previously applied firm name", () => {
    expect(
      applyFirmToText(
        "Subject: Streamlining work for Khaitan & Khaitan",
        "Khaitan & Co",
        "Khaitan & Khaitan",
      ),
    ).toBe("Subject: Streamlining work for Khaitan & Co");
  });
});

describe("applyFirmToTemplates", () => {
  it("updates every template field", () => {
    const next = applyFirmToTemplates(
      {
        linkedinNote: "Hi, writing about {org}.",
        linkedinMessage: "",
        inmail: "Khaitan & Khaitan team",
        linkedinFollowUp: "",
        coldEmail: "",
        followUp: "",
      },
      "Khaitan & Co",
      "Khaitan & Khaitan",
    );

    expect(next.linkedinNote).toBe("Hi, writing about Khaitan & Co.");
    expect(next.inmail).toBe("Khaitan & Co team");
  });
});

describe("fillTemplatePlaceholders", () => {
  it("fills name and org for copy preview", () => {
    expect(fillTemplatePlaceholders("Hi {name}, we help {org}.", "Rahul", "Khaitan & Co")).toBe(
      "Hi Rahul, we help Khaitan & Co.",
    );
  });
});
