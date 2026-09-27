"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitProgressUpdate } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ProgressUpdateForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="space-y-3"
      action={(formData) => {
        startTransition(async () => {
          try {
            const logged = await submitProgressUpdate(formData);
            formRef.current?.reset();
            router.refresh();
            toast.success(`Logged ${logged} ${logged === 1 ? "activity" : "activities"}`);
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Something went wrong",
            );
          }
        });
      }}
    >
      <Textarea name="text" rows={3} required />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Logging..." : "Log it"}
      </Button>
    </form>
  );
}
