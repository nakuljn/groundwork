const ASCII_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ASCII_LOWER = "abcdefghijklmnopqrstuvwxyz";
const ASCII_DIGITS = "0123456789";

function range(start: number, length: number) {
  return Array.from({ length }, (_, index) => String.fromCodePoint(start + index)).join("");
}

const sets = {
  bold: {
    upper: range(0x1d400, 26),
    lower: range(0x1d41a, 26),
    digits: range(0x1d7ce, 10),
  },
  italic: {
    upper: range(0x1d434, 26),
    lower: range(0x1d44e, 26),
    digits: ASCII_DIGITS,
  },
};

const reverse = new Map<string, string>();
for (const set of Object.values(sets)) {
  [...set.upper].forEach((char, index) => reverse.set(char, ASCII_UPPER[index]));
  [...set.lower].forEach((char, index) => reverse.set(char, ASCII_LOWER[index]));
  [...set.digits].forEach((char, index) => reverse.set(char, ASCII_DIGITS[index]));
}

export type LinkedInFormat = "bold" | "italic";

export function unicodeStyle(text: string, style: LinkedInFormat) {
  const set = sets[style];
  return Array.from(text)
    .map((char) => {
      const plain = reverse.get(char) ?? char;
      const upper = ASCII_UPPER.indexOf(plain);
      if (upper >= 0) return Array.from(set.upper)[upper];
      const lower = ASCII_LOWER.indexOf(plain);
      if (lower >= 0) return Array.from(set.lower)[lower];
      const digit = ASCII_DIGITS.indexOf(plain);
      if (digit >= 0) return Array.from(set.digits)[digit];
      return char;
    })
    .join("");
}

export function stripUnicodeStyle(text: string) {
  return Array.from(text)
    .map((char) => reverse.get(char) ?? char)
    .join("");
}

export function formatSelectedLines(
  text: string,
  start: number,
  end: number,
  kind: "bullets" | "numbers",
) {
  const selection = text.slice(start, end);
  const formatted = selection
    .split("\n")
    .map((line, index) => {
      const clean = line.replace(/^\s*(?:[•▪◦-]|\d+[.)])\s*/, "");
      return kind === "bullets" ? `• ${clean}` : `${index + 1}. ${clean}`;
    })
    .join("\n");
  return {
    text: text.slice(0, start) + formatted + text.slice(end),
    start,
    end: start + formatted.length,
  };
}

/** Converts **phrase** markers to LinkedIn Unicode bold. */
export function applyInlineBold(text: string) {
  return text.replace(/\*\*([^*\n]+)\*\*/g, (_, inner: string) => unicodeStyle(inner.trim(), "bold"));
}

export function stripInlineBoldMarkers(text: string) {
  return text.replace(/\*\*([^*\n]+)\*\*/g, "$1");
}

export function applySelectionStyle(
  text: string,
  start: number,
  end: number,
  style: LinkedInFormat,
) {
  const formatted = unicodeStyle(text.slice(start, end), style);
  return {
    text: text.slice(0, start) + formatted + text.slice(end),
    start,
    end: start + formatted.length,
  };
}
