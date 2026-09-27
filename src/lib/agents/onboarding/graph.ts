import { END, START, StateGraph } from "@langchain/langgraph";
import { saveCheckpoint } from "./checkpointer";
import {
  assemblerNode,
  audienceStrategistNode,
  channelStrategistNode,
  contentStrategistNode,
  criticNode,
  humanReviewNode,
  marketResearchNode,
  productAnalystNode,
} from "./nodes";
import { OnboardingState, type OnboardingInput } from "./state";

function buildGraph() {
  const graph = new StateGraph(OnboardingState)
    .addNode("product_analyst", productAnalystNode)
    .addNode("audience_strategist", audienceStrategistNode)
    .addNode("market_research", marketResearchNode)
    .addNode("channel_strategist", channelStrategistNode)
    .addNode("content_strategist", contentStrategistNode)
    .addNode("assembler", assemblerNode)
    .addNode("critic", criticNode)
    .addNode("human_review", humanReviewNode)
    .addEdge(START, "product_analyst")
    .addEdge("product_analyst", "audience_strategist")
    .addEdge("product_analyst", "market_research")
    .addEdge("product_analyst", "channel_strategist")
    .addEdge("product_analyst", "content_strategist")
    .addEdge("audience_strategist", "assembler")
    .addEdge("market_research", "assembler")
    .addEdge("channel_strategist", "assembler")
    .addEdge("content_strategist", "assembler")
    .addEdge("assembler", "critic")
    .addConditionalEdges(
      "critic",
      (state) => {
        if (!state.issues?.length) return "human_review";
        if ((state.criticRetries ?? 0) >= 2) return "human_review";
        return "assembler";
      },
      {
        assembler: "assembler",
        human_review: "human_review",
      },
    )
    .addEdge("human_review", END);

  return graph.compile();
}

let cached: ReturnType<typeof buildGraph> | null = null;

export function onboardingGraph() {
  if (!cached) cached = buildGraph();
  return cached;
}

export async function runOnboardingGraph(input: OnboardingInput, threadId?: string) {
  const graph = onboardingGraph();
  const result = await graph.invoke({
    input,
    artifacts: [],
    issues: [],
    criticRetries: 0,
    status: "running",
  });
  if (threadId) await saveCheckpoint(threadId, result);
  return result;
}

export async function* streamOnboardingGraph(input: OnboardingInput, threadId?: string) {
  const graph = onboardingGraph();
  const stream = await graph.stream(
    {
      input,
      artifacts: [],
      issues: [],
      criticRetries: 0,
      status: "running",
    },
    { streamMode: "updates" },
  );

  for await (const chunk of stream) {
    if (threadId) await saveCheckpoint(threadId, chunk);
    yield chunk;
  }
}

