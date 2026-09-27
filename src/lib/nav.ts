import type { LucideIcon } from "lucide-react";
import {
  Activity,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  MessageSquare,
  Settings,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavSoonItem = {
  label: string;
  description: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
  soon?: NavSoonItem[];
};

export const NAV_HOME: NavItem = { href: "/", label: "Dashboard", icon: LayoutDashboard };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Sales",
    items: [
      { href: "/plan", label: "Plan", icon: ListChecks },
      { href: "/list", label: "Messages", icon: MessageSquare },
    ],
    soon: [{ label: "Leads", description: "B2B firms and clients" }],
  },
  {
    label: "Marketing",
    items: [{ href: "/marketing", label: "LinkedIn posts", icon: Megaphone }],
    soon: [
      { label: "Campaigns", description: "Paid campaigns on LinkedIn and Instagram" },
      { label: "Instagram posts", description: "Organic Instagram content" },
    ],
  },
  {
    label: "Website",
    items: [],
    soon: [{ label: "SEO", description: "Search and scheduled blogs" }],
  },
];

export const NAV_BOTTOM: NavItem[] = [
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
