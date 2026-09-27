import { getTracks } from "@/lib/tracks";
import { getProgressSummary } from "@/lib/progress";
import { getTodayMarketingAction } from "@/lib/marketing";

export type TodayAction = {
  id: string;
  label: string;
  href: string;
  button: string;
  priority: number;
};

export async function getTodayActions(productId: number): Promise<TodayAction[]> {
  const [tracks, progress, marketing] = await Promise.all([
    getTracks(productId),
    getProgressSummary(productId),
    getTodayMarketingAction(productId),
  ]);

  const actions: TodayAction[] = [];
  const active = tracks.filter((t) => t.status === "active");

  for (const track of active) {
    if (track.current) {
      actions.push({
        id: `plan-${track.id}`,
        label: `${track.name}: ${track.current.title}`,
        href: `/plan#track-${track.id}`,
        button: "Continue",
        priority: 1,
      });
    }
  }

  if (progress.pendingFollowUps > 0) {
    actions.push({
      id: "follow-ups",
      label: `${progress.pendingFollowUps} ${progress.pendingFollowUps === 1 ? "person is" : "people are"} due a follow-up`,
      href: "/list",
      button: "View messages",
      priority: 2,
    });
  }

  if (marketing.kind === "post_today") {
    actions.push({
      id: "marketing-post",
      label: `Post today: ${marketing.hook}`,
      href: `/marketing`,
      button: "Open post",
      priority: 0,
    });
  } else if (marketing.kind === "draft_next") {
    actions.push({
      id: "marketing-draft",
      label:
        marketing.dayLabel === "today"
          ? "Draft today's LinkedIn post"
          : `Draft ${marketing.dayLabel}'s LinkedIn post`,
      href: "/marketing",
      button: "Plan post",
      priority: 3,
    });
  } else if (marketing.kind === "plan_week") {
    actions.push({
      id: "marketing-plan",
      label: "Plan this week's LinkedIn posts",
      href: "/marketing",
      button: "Plan week",
      priority: 3,
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}
