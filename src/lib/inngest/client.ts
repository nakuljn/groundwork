import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "groundwork" });

export const runtimeAgents = inngest.createFunction(
  {
    id: "runtime-agent",
    retries: 2,
    triggers: [{ event: "groundwork/runtime-agent.run" }],
  },
  async ({ event, step }) => {
    const { agent, input, workspaceId } = event.data as {
      agent: "prospect_research" | "outreach_writer" | "content_planner";
      input: Record<string, unknown>;
      workspaceId: number;
    };

    return step.run("execute-agent", async () => {
      const { runRuntimeAgent } = await import("@/lib/agents/runtime");
      const { getActiveWorkspaceBlueprint } = await import("@/lib/blueprint/service");
      const { blueprint } = await getActiveWorkspaceBlueprint(workspaceId);
      return runRuntimeAgent(agent, input, blueprint);
    });
  },
);
