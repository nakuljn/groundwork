export function formatChannelLabel(channel: string) {
  const map: Record<string, string> = {
    linkedin: "LinkedIn",
    google: "Google",
    instagram_fb: "Instagram / FB",
    email: "Email",
    offline: "Offline",
    other: "Other",
  };
  return map[channel] ?? channel;
}

export function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
