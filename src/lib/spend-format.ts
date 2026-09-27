import type { Blueprint } from "./blueprint/schema";
import { LEGAL_INDIA_BLUEPRINT } from "./blueprint/legal-india.fixture";

export function formatMoney(
  amountMinor: number,
  blueprint: Blueprint = LEGAL_INDIA_BLUEPRINT,
) {
  const locale = blueprint.product.locale.locale;
  const currency = blueprint.product.locale.currency;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / (currency === "INR" ? 1 : 100));
}

/** @deprecated use formatMoney with blueprint */
export function formatInr(amount: number) {
  return formatMoney(amount, LEGAL_INDIA_BLUEPRINT);
}

export function formatChannelLabel(channel: string) {
  const map: Record<string, string> = {
    linkedin: "LinkedIn",
    email: "Email",
    google: "Google",
    instagram_fb: "Instagram / Facebook",
    offline: "Offline",
    other: "Other",
  };
  return map[channel] ?? channel;
}
