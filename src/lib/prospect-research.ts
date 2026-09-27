import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, researchRuns, type ResearchRun } from "@/db/schema";
import { generate } from "./ai";
import {
  extractionSchema,
  guideSchema,
  type Prospect,
  type SearchGuide,
} from "./prospect-types";

export type { Prospect, SearchGuide } from "./prospect-types";

type SourcePage = { url: string; title: string; content: string };

const MAX_PAGES = 20;
const PAGE_CHARS = 2000;

export async function runProspectResearch({
  productId,
  target,
  location,
  count,
}: {
  productId: number;
  target: string;
  location: string;
  count: number;
}) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId));
  if (!product) throw new Error("Product not found");

  const guide = await generate({
    system: `You are a B2B prospecting expert. Plan how to find prospects for a product and teach the founder exactly how to search. Return JSON:
{"googleQueries":["..."],"salesNavigator":{"filters":[{"name":"Geography","value":"..."}],"steps":["..."]},"linkedinSearch":{"booleanQuery":"...","steps":["..."]},"tips":["..."]}
Rules:
- googleQueries: 3-5 web search queries that surface pages listing real firms or people matching the target (directories, firm websites, bar association lists, "top X in city" pages). Include the location in each query.
- salesNavigator.filters: exact Sales Navigator Lead filter names and the values to pick (Geography, Industry, Function, Seniority level, Company headcount, Keywords, Years in current company, Posted on LinkedIn in past 30 days, etc.).
- salesNavigator.steps: numbered click-by-click tutorial, including saving the search and a daily routine.
- linkedinSearch.booleanQuery: a free LinkedIn search string with AND/OR/quotes.
- linkedinSearch.steps: how to run it on free LinkedIn and which filters to apply.
- tips: 2-4 short practical tips (connection request limits, who responds best).`,
    prompt: `Product brief:
${product.brief ?? product.oneLiner ?? product.name}

Target: ${target}
Location: ${location || "not specified"}
Number of prospects wanted: ${count}`,
    schema: guideSchema,
  });

  let prospects: Prospect[] = [];
  let sourceCount = 0;
  let error: string | null = null;

  if (!process.env.FIRECRAWL_API_KEY?.trim()) {
    error =
      "Automatic web search needs a Firecrawl API key. Add FIRECRAWL_API_KEY to .env.local (get one free at firecrawl.dev), restart the dev server, then click Find prospects again.";
  } else {
    const { pages, errors } = await searchWeb(guide.googleQueries);
    sourceCount = pages.length;

    if (pages.length === 0) {
      const hint = errors[0]?.includes("401")
        ? "Firecrawl rejected your API key (401). Copy a fresh key from firecrawl.dev → API keys, update .env.local, restart the dev server, and try again."
        : errors[0] ?? "No pages found";
      error = `Web search returned nothing: ${hint}`;
    } else {
      prospects = await extractProspects({
        brief: product.brief ?? product.oneLiner ?? product.name,
        target,
        location,
        count,
        pages,
      });
    }
  }

  const [run] = await db
    .insert(researchRuns)
    .values({
      productId,
      target,
      location: location || null,
      guide: JSON.stringify(guide),
      results: JSON.stringify(prospects),
      sourceCount,
      error,
    })
    .returning();

  return run;
}

async function searchWeb(queries: string[]) {
  const pages: SourcePage[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  const batches = await Promise.all(
    queries.map((q) =>
      firecrawlSearch(q).catch((e: unknown) => {
        errors.push(e instanceof Error ? e.message : String(e));
        return [] as SourcePage[];
      }),
    ),
  );

  for (const page of batches.flat()) {
    if (!page.url || seen.has(page.url) || !page.content.trim()) continue;
    seen.add(page.url);
    pages.push(page);
    if (pages.length >= MAX_PAGES) break;
  }

  return { pages, errors };
}

async function firecrawlSearch(query: string): Promise<SourcePage[]> {
  const response = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      limit: 5,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error(`Firecrawl ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }

  const json = (await response.json()) as {
    data?: unknown;
  };

  const items = (
    Array.isArray(json.data)
      ? json.data
      : ((json.data as { web?: unknown[] } | undefined)?.web ?? [])
  ) as Array<{
    url?: string;
    title?: string;
    description?: string;
    markdown?: string;
    metadata?: { title?: string };
  }>;

  return items.map((item) => ({
    url: item.url ?? "",
    title: item.title ?? item.metadata?.title ?? "",
    content: (item.markdown ?? item.description ?? "").slice(0, PAGE_CHARS),
  }));
}

async function extractProspects({
  brief,
  target,
  location,
  count,
  pages,
}: {
  brief: string;
  target: string;
  location: string;
  count: number;
  pages: SourcePage[];
}) {
  const sources = pages
    .map((p, i) => `[Source ${i + 1}] ${p.title}\nURL: ${p.url}\n${p.content}`)
    .join("\n\n---\n\n");

  const result = await generate({
    system: `Extract real prospects from web search results. Return JSON:
{"prospects":[{"firmName":"","personName":"","role":"","type":"solo|firm|company","sizeEstimate":"","city":"","website":"","email":"","phone":"","linkedinUrl":"","whyFit":"","sourceUrl":""}]}
Rules:
- Only include firms or people that actually appear in the sources. Never invent names, emails, phones or URLs.
- Leave a field as "" when the source does not state it.
- sizeEstimate: e.g. "Solo", "2-10 lawyers", "11-50", based only on what the source says; "" if unknown.
- sourceUrl must be the URL of the source where you found them.
- whyFit: one sentence on why they fit the product, based on the source.
- Skip aggregator sites themselves, news outlets, and competitors of the product.`,
    prompt: `Product brief:
${brief}

Target: ${target}
Location: ${location || "any"}
Return up to ${count} of the best matches.

Search results:
${sources}`,
    schema: extractionSchema,
  });

  return result.prospects
    .filter((p) => p.firmName || p.personName)
    .slice(0, count);
}

export async function getLatestResearchRun(productId: number) {
  const [run] = await db
    .select()
    .from(researchRuns)
    .where(eq(researchRuns.productId, productId))
    .orderBy(desc(researchRuns.createdAt))
    .limit(1);
  return run ?? null;
}

export function parseRun(run: ResearchRun) {
  return {
    guide: JSON.parse(run.guide) as SearchGuide,
    prospects: JSON.parse(run.results) as Prospect[],
    added: JSON.parse(run.added) as number[],
  };
}
