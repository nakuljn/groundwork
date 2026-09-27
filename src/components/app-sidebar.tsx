"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_BOTTOM, NAV_GROUPS, NAV_HOME, isNavActive } from "@/lib/nav";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-card/30">
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">Groundwork</p>
          <p className="text-[11px] text-muted-foreground">Sales & marketing</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2 pb-4">
        <div className="space-y-0.5">
          <Link
            href={NAV_HOME.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              isNavActive(pathname, NAV_HOME.href)
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <NAV_HOME.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
            {NAV_HOME.label}
          </Link>
        </div>

        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isNavActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    {label}
                  </Link>
                );
              })}
              {group.soon?.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-2 rounded-md px-2.5 py-1.5 opacity-50"
                >
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{item.label}</span>
                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                        Soon
                      </Badge>
                    </div>
                    <p className="text-[10px] leading-snug text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-2 pb-5">
        <Separator className="mb-2" />
        <div className="space-y-0.5">
          {NAV_BOTTOM.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
