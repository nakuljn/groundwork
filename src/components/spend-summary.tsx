import Link from "next/link";
import { format } from "date-fns";
import { getSpendSummary, formatChannelLabel, formatMoney } from "@/lib/spend";
import { getWorkspaceContext } from "@/lib/workspace";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export async function SpendSummary({ productId }: { productId: number }) {
  const { blueprint } = await getWorkspaceContext();
  const summary = await getSpendSummary(productId, blueprint);
  const fmt = (amount: number) => formatMoney(amount, blueprint);
  const paidChannels = summary.channelMetrics.filter(
    (m) => m.spendInr > 0 || m.replies > 0,
  );

  return (
    <div id="spend" className="scroll-mt-6 space-y-4">
      <div className="grid grid-cols-2 divide-x rounded-xl border">
        <div className="px-5 py-4">
          <p className="text-sm text-foreground/70">This month</p>
          <p className="text-2xl font-semibold tabular-nums">{fmt(summary.monthTotal)}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-foreground/70">All time</p>
          <p className="text-2xl font-semibold tabular-nums">{fmt(summary.allTimeTotal)}</p>
        </div>
      </div>

      {paidChannels.length === 0 ? (
        <p className="text-sm text-foreground/70">
          Nothing yet. Log costs in{" "}
          <Link href="/activity" className="underline">
            Activity
          </Link>
          .
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Spend</TableHead>
              <TableHead>Replies</TableHead>
              <TableHead>Meetings</TableHead>
              <TableHead>Cost / reply</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paidChannels.map((m) => (
              <TableRow key={m.channel}>
                <TableCell>{formatChannelLabel(m.channel)}</TableCell>
                <TableCell>{fmt(m.spendInr)}</TableCell>
                <TableCell>{m.replies}</TableCell>
                <TableCell>{m.meetings}</TableCell>
                <TableCell>{m.costPerReply ? fmt(m.costPerReply) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {summary.paidActivities.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {summary.paidActivities.slice(0, 8).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm">{a.note || a.type}</p>
                <p className="text-xs text-foreground/60">
                  {formatChannelLabel(a.channel)} · {format(a.createdAt, "MMM d, yyyy")}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {fmt(a.costMinor > 0 ? a.costMinor : a.costInr)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
