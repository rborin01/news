# Spec: True Press W27-W29 Unification Sprint

> Author: FORGE Architect (Claude Opus)
> Date: 2026-03-31
> Status: APPROVED

## W27 — Switch Groq to Claude API

### Problem
Edge Function uses Groq free tier (100k tokens/day). Rodrigo has paid Anthropic subscription.

### Changes to `supabase/functions/gemini-proxy/index.ts`
1. Replace `GROQ_API_KEY` env var with `ANTHROPIC_API_KEY`
2. Replace `GROQ_MODEL` constant with `CLAUDE_MODEL = "claude-haiku-4-5-20251001"`
3. Replace `callGroq()` with `callClaude()` — Anthropic Messages API
4. Update health check to test Anthropic API
5. Update `model_used` field: `claude-haiku` instead of `groq-llama`
6. Update `generate_article` action: `author_ai` field
7. Keep: embedding (Gemini), RSS collection, all other actions unchanged

### API Format
```
POST https://api.anthropic.com/v1/messages
Headers: x-api-key, anthropic-version: 2023-06-01, content-type: application/json
Body: { model, max_tokens, messages: [{role:"user", content}] }
Response: data.content[0].text
```

### MANUAL STEP (Rodrigo required)
```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref sfnvctljxidzueoutnxv
```

## W28 — ATUALIZAR button + generate action

### Part A: Friday ATUALIZAR button
Add button in `news.js` sidebar after PIPELINE section.
Calls collect_rss then process_queue sequentially.

### Part B: generate action
Already exists in index.ts at line 252. Will be updated to use callClaude.

## W29 — IntelDashboard Component

### New Component: `components/IntelDashboard.tsx`
Stats cards + business briefings for news.rodrigoborin.com.

### Stats
- Total articles, Today (24h), Recent (48h), Score>=70, Avg Score

### Business Briefings
- AgroVision, QuantumCore, NeuroHealth, NeuroGrid, NeuroSoft, PulsAI
- Mapped by level_2_project or level_1_domain or category keywords

### Integration
- Imported into Dashboard.tsx, rendered above Resumo Executivo in media view

## NON-NEGOTIABLE
- 17 canonical categories preserved exactly
- No file > 500 lines
- All existing actions unchanged
