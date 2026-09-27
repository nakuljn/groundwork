"use client";

import { logoutAction } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function SignOutButton({ compact }: { compact?: boolean }) {
  return (
    <form action={logoutAction}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className={cn(
          compact ? "h-8" : "h-8 w-full justify-start gap-2 px-2.5 text-muted-foreground",
        )}
      >
        {compact ? "Sign out" : (
          <>
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </>
        )}
      </Button>
    </form>
  );
}
