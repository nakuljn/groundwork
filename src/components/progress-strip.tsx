import { formatInr } from "@/lib/spend-format";

type ProgressData = {
  last7: {
    reachedOut: number;
    replies: number;
    meetings: number;
    signups: number;
  };
  last30: {
    reachedOut: number;
    replies: number;
    meetings: number;
    signups: number;
  };
  monthSpend: number;
  totalContacts: number;
  pendingFollowUps: number;
};

export function ProgressStrip({ data }: { data: ProgressData }) {
  const items = [
    { label: "Reached out", value: data.last7.reachedOut, sub: `${data.last30.reachedOut} in 30d` },
    { label: "Replies", value: data.last7.replies, sub: `${data.last30.replies} in 30d` },
    { label: "Meetings", value: data.last7.meetings, sub: `${data.last30.meetings} in 30d` },
    { label: "Signups", value: data.last7.signups, sub: `${data.last30.signups} in 30d` },
    { label: "Spend", value: formatInr(data.monthSpend), sub: "this month" },
    { label: "Contacts", value: data.totalContacts, sub: "total" },
    { label: "Follow-ups due", value: data.pendingFollowUps, sub: "3+ days waiting" },
  ];

  return (
    <div className="grid grid-cols-2 divide-y rounded-xl border bg-card sm:grid-cols-4 sm:divide-y-0 lg:grid-cols-7 lg:divide-x">
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3">
          <p className="text-sm text-foreground/70">{item.label}</p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums">{item.value}</p>
          <p className="text-xs text-foreground/60">{item.sub}</p>
        </div>
      ))}
    </div>
  );
}
