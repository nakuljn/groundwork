import { serve } from "inngest/next";
import { inngest, runtimeAgents } from "@/lib/inngest/client";

export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runtimeAgents],
});
