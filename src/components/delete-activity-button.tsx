"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteActivity } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function DeleteActivityButton({ activityId }: { activityId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label="Delete activity"
      onClick={() => {
        if (!confirm("Delete this entry?")) return;
        startTransition(async () => {
          try {
            await deleteActivity(activityId);
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not delete");
          }
        });
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
