# Groundwork

Personal outreach and marketing assistant. Works for any product.

## What it does

- **Home**: 3–5 AI-recommended next steps with ready-to-copy messages and tool suggestions
- **People**: import prospects, generate LinkedIn notes / cold emails / follow-ups
- **Activity**: log what you did (outreach, posts, calls, meetings)
- **Spend**: track marketing and sales purchases by channel; see cost per reply/meeting/signup
- **Settings**: describe your product, optionally point at a repo + website for an AI-written brief

## Setup

```bash
cd ~/Github/groundwork
cp .env.example .env.local
# Add your OPENAI_API_KEY

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## First run

1. Go to **Settings** → add product name, audience, website, repo path → **Save**
2. Click **Understand my product** to generate a brief
3. Go to **People** → paste contacts from Sales Navigator
4. Open **Home** → copy assets from next steps and execute on LinkedIn
5. Type what you did in **"I did X, what next?"** → get fresh suggestions
6. Log subscriptions and ad spend in **Spend**

Data is stored locally in `data/groundwork.db`.

## Stack

Next.js · SQLite · Drizzle · OpenAI / Claude · shadcn/ui

Outreach messages and plan steps use the writing model: Claude Sonnet when `ANTHROPIC_API_KEY` is set, otherwise `gpt-5`. Override with `AI_WRITING_PROVIDER` and `AI_WRITING_MODEL`. Everything else uses `OPENAI_MODEL`.
