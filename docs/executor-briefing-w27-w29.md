# Executor Briefing: W27-W29 Unification Sprint

> Date: 2026-03-31
> Architect: Claude Opus (FORGE)
> Status: IMPLEMENTED (self-contained run)

## Summary

Three sprints delivered in a single session:

### W27: Groq -> Claude API
- **File**: `supabase/functions/gemini-proxy/index.ts`
- Replaced `callGroq()` with `callClaude()` using Anthropic Messages API
- Model: `claude-haiku-4-5-20251001`
- API: `https://api.anthropic.com/v1/messages`
- Auth: `x-api-key` + `anthropic-version: 2023-06-01`
- Health check now tests Claude (POST /v1/messages with max_tokens:10)
- All `model_used` fields report `claude-*` instead of `groq-*`
- `generate_article` action: `author_ai` now `claude-*`

### W28: ATUALIZAR Button + Generate Action
- **File**: `E:/IA/Claude/Friday/dashboard/pages/news.js`
- Added `collectAndProcess()` function (collect_rss then process_queue)
- Added button HTML in sidebar after PIPELINE section
- `generate` action in index.ts already existed -- now uses Claude

### W29: IntelDashboard Component
- **New File**: `components/IntelDashboard.tsx` (175 lines)
- Stats row: Total, Today, Recent 48h, Score>=70, Avg Score
- Business briefings: AgroVision, QuantumCore, NeuroHealth, NeuroGrid, NeuroSoft, PulsAI
- Pipeline status bar (pending/processing/done/error)
- "Atualizar Pipeline" button (collect + process)
- **Modified**: `components/Dashboard.tsx` -- imports + renders IntelDashboard

## MANUAL STEP REQUIRED (Rodrigo)

The ANTHROPIC_API_KEY must be set as a Supabase secret:

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-YOUR-KEY-HERE --project-ref sfnvctljxidzueoutnxv
```

Then deploy:
```bash
cd "C:/Users/rodri/Meu Drive/Claude/TruePress/news-code"
npx supabase functions deploy gemini-proxy --project-ref sfnvctljxidzueoutnxv
```

## Files Changed
1. `supabase/functions/gemini-proxy/index.ts` -- Groq->Claude (W27)
2. `E:/IA/Claude/Friday/dashboard/pages/news.js` -- ATUALIZAR button (W28)
3. `components/IntelDashboard.tsx` -- NEW (W29)
4. `components/Dashboard.tsx` -- import IntelDashboard (W29)
5. `docs/spec-truepress-w27-w29.md` -- spec
6. `tests/e2e/w27-w29-unification.spec.ts` -- tests
7. `docs/executor-briefing-w27-w29.md` -- this file

## 17 Canonical Categories: PRESERVED
All category strings in the analyzeNews prompt are unchanged.
