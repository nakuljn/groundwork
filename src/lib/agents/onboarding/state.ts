import { Annotation } from "@langchain/langgraph";
import type { Blueprint } from "@/lib/blueprint/schema";

export type OnboardingInput = {
  workspaceId: number;
  productName: string;
  websiteUrl?: string;
  repoPath?: string;
  goals?: string;
  rawContext?: string;
};

export type AgentArtifact = {
  agent: string;
  summary: string;
  data: unknown;
};

export const OnboardingState = Annotation.Root({
  input: Annotation<OnboardingInput>,
  productFacts: Annotation<string>,
  audienceDraft: Annotation<Partial<Blueprint["segments"]>>,
  marketDraft: Annotation<Partial<Blueprint["prospecting"]>>,
  channelDraft: Annotation<unknown>,
  contentDraft: Annotation<Partial<Blueprint["content"]>>,
  tracksDraft: Annotation<Partial<Blueprint["tracks"]>>,
  blueprint: Annotation<Blueprint | null>,
  issues: Annotation<string[]>,
  artifacts: Annotation<AgentArtifact[]>,
  criticRetries: Annotation<number>,
  status: Annotation<"running" | "review" | "published" | "failed">,
});
