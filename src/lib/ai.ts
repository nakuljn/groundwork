import OpenAI from "openai";
import { z } from "zod";

export type AiProvider = "openai" | "sarvam" | "anthropic";

/**
 * "writing" is anything the founder sends to a human (outreach, plan assets):
 * it goes to the strongest configured model. "general" is parsing and planning.
 */
export type AiTask = "general" | "writing";

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in .env.local");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateImagePng(prompt: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set in .env.local");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1-mini",
      prompt,
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI image error ${response.status}: ${(await response.text()).slice(0, 240)}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const image = payload.data?.[0];
  if (image?.b64_json) return Buffer.from(image.b64_json, "base64");
  if (image?.url) {
    const download = await fetch(image.url);
    if (!download.ok) throw new Error("Generated image could not be downloaded");
    return Buffer.from(await download.arrayBuffer());
  }
  throw new Error("OpenAI returned no image");
}

function isProvider(value: string | undefined): value is AiProvider {
  return value === "openai" || value === "sarvam" || value === "anthropic";
}

function defaultModel(provider: AiProvider, task: AiTask) {
  if (provider === "anthropic") return process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  if (provider === "sarvam") return process.env.SARVAM_MODEL || "sarvam-m";
  return task === "writing" ? "gpt-5" : process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export function resolveModel(task: AiTask, provider?: AiProvider) {
  if (provider) return { provider, model: defaultModel(provider, task) };

  if (task === "writing") {
    const configured = process.env.AI_WRITING_PROVIDER?.trim().toLowerCase();
    const chosen: AiProvider = isProvider(configured)
      ? configured
      : process.env.ANTHROPIC_API_KEY
        ? "anthropic"
        : "openai";
    return {
      provider: chosen,
      model: process.env.AI_WRITING_MODEL?.trim() || defaultModel(chosen, task),
    };
  }

  return { provider: "openai" as const, model: defaultModel("openai", task) };
}

/** Reasoning models (gpt-5 family, o-series) reject a non-default temperature. */
function acceptsTemperature(model: string) {
  return !/^(gpt-5|o\d)/i.test(model);
}

function withJsonHint(system: string, prompt: string) {
  return {
    system: system.toLowerCase().includes("json")
      ? system
      : `${system}\n\nRespond with valid JSON only.`,
    prompt: prompt.toLowerCase().includes("json")
      ? prompt
      : `${prompt}\n\nReturn your answer as a JSON object.`,
  };
}

function parseJson<T>(content: string, schema: z.ZodType<T>, source: string): T {
  const unfenced = content.replace(/```(?:json)?/gi, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  const raw = start >= 0 && end > start ? unfenced.slice(start, end + 1) : unfenced;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${source} returned invalid JSON. Try again.`);
  }

  const result = schema.safeParse(parsed);
  if (result.success) return result.data;

  const issue = result.error.issues[0];
  throw new Error(
    issue
      ? `${issue.path.join(".") || "response"}: ${issue.message}`
      : "AI response did not match the expected format. Try again.",
  );
}

export async function generate<T>({
  system,
  prompt,
  schema,
  provider,
  task = "general",
  temperature = 0.7,
}: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  provider?: AiProvider;
  task?: AiTask;
  temperature?: number;
}): Promise<T> {
  const target = resolveModel(task, provider);
  const hinted = withJsonHint(system, prompt);

  if (target.provider === "anthropic") {
    return generateWithAnthropic({ ...hinted, schema, model: target.model });
  }
  if (target.provider === "sarvam") {
    return generateWithSarvam({ ...hinted, schema, model: target.model });
  }

  const response = await getOpenAI().chat.completions.create({
    model: target.model,
    messages: [
      { role: "system", content: hinted.system },
      { role: "user", content: hinted.prompt },
    ],
    response_format: { type: "json_object" },
    ...(acceptsTemperature(target.model) ? { temperature } : {}),
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");
  return parseJson(content, schema, "OpenAI");
}

async function generateWithAnthropic<T>({
  system,
  prompt,
  schema,
  model,
}: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  model: string;
}): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set in .env.local");

  // Sampling parameters are omitted: Claude 5 models reject non-default temperature.
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(180000),
  });

  if (!response.ok) {
    throw new Error(`Claude API error ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const content = (data.content ?? [])
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n");
  if (!content) throw new Error("No response from Claude");
  return parseJson(content, schema, "Claude");
}

async function generateWithSarvam<T>({
  system,
  prompt,
  schema,
  model,
}: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  model: string;
}): Promise<T> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new Error("SARVAM_API_KEY is not set in .env.local");
  }

  const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": apiKey,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sarvam API error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.replace(/<think>[\s\S]*?<\/think>/g, "");
  if (!content) {
    throw new Error("No response from Sarvam");
  }
  return parseJson(content, schema, "Sarvam");
}
