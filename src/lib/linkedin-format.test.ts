import { describe, expect, it } from "vitest";
import {
  applySelectionStyle,
  formatSelectedLines,
  stripUnicodeStyle,
  unicodeStyle,
} from "./linkedin-format";

describe("LinkedIn Unicode formatting", () => {
  it("round-trips bold and italic text", () => {
    const plain = "Knowlex Legal 2026";
    expect(stripUnicodeStyle(unicodeStyle(plain, "bold"))).toBe(plain);
    expect(stripUnicodeStyle(unicodeStyle(plain, "italic"))).toBe(plain);
  });

  it("only styles the selected range", () => {
    const result = applySelectionStyle("Make this bold", 5, 9, "bold");
    expect(stripUnicodeStyle(result.text)).toBe("Make this bold");
    expect(result.text).not.toBe("Make this bold");
  });

  it("formats selected lines as bullets or numbers", () => {
    expect(formatSelectedLines("one\ntwo", 0, 7, "bullets").text).toBe("• one\n• two");
    expect(formatSelectedLines("one\ntwo", 0, 7, "numbers").text).toBe("1. one\n2. two");
  });
});
