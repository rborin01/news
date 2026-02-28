# CLAUDE.md — True Press Intelligence Hub v2.0

> Cole este arquivo no início de TODA nova sessão sobre o True Press.

> Última atualização: 28/02/2026 | Versão: 4.1.0

## 📊 DASHBOARD DA SESSÃO

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SESSÃO: True Press | Global: % | Local: _%
✅ Feito: [liste]
🔄 Fazendo: [tarefa]
⬜ Próximo: [próxima]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🎯 O QUE É

Hub de inteligência: RSS → Gemini → Supabase → Dashboard.

O banco processed_news é compartilhado com QuantumCore, NeuroGrid e AgroVision.

## 🔗 ACESSOS

| Serviço | URL |
|---|---|
| Site | https://news.rodrigoborin.com |
| GitHub | https://github.com/rborin01/news |
| Supabase | https://supabase.com/dashboard/project/sfnvctljxidzueoutnxv |
| SQL Editor | https://supabase.com/dashboard/project/sfnvctljxidzueoutnxv/sql/new |
| Edge Functions | https://supabase.com/dashboard/project/sfnvctljxidzueoutnxv/functions |
| Cron | https://supabase.com/dashboard/project/sfnvctljxidzueoutnxv/integrations/cron/overview |
| Vercel | https://vercel.com/rodrigos-projects-7f21a156/news |

## 📦 STACK

React 19 + TypeScript + Vite + Tailwind | Gemini 2.0 Flash | Supabase pgvector | Vercel

## 🗄️ CAMPOS CRÍTICOS — processed_news

```
narrative_media → o que a mídia quer transmitir
hidden_intent   → quem se beneficia e por quê
real_facts      → o que realmente acontece
impact_rodrigo  → impacto em Trading/Agro/Imóveis/IA
score_rodrigo   → 0-100 relevância pessoal
score_brasil    → 0-100 relevância nacional
level_1_domain  → Finance_Trading|Politics|Agro|Tech|World|Health|Legal
level_2_project → TruePress|QuantumCore|NeuroGrid|AgroVision|todos
level_3_tag     → tag snake_case
embedding       → vector(768)
```

## ⚙️ EDGE FUNCTION gemini-proxy — Actions

generate | embed | analyze_news | process_queue | ingest_rss | save | search

Secrets: GEMINI_API_KEY ✅ SUPABASE_URL ✅ SUPABASE_SERVICE_ROLE_KEY ✅

## 🤖 CRON (servidor — site NÃO precisa ficar aberto)

*/30min → ingest_rss ✅

*/35min → process_queue (batch=10) ✅

## 📁 ARQUIVOS-CHAVE

App.tsx v4.1.0 — Piloto Automático + init Supabase (commit 3476df0)

services/supabaseClient.ts — callGeminiProxy

services/newsQueue.ts — pipeline RSS

supabase/functions/gemini-proxy/index.ts — Edge Function

src/pages/monitor.tsx — dashboard pipeline (commit 235bc50)

## ✅ COMMITS IMPORTANTES

2aa814c — CLAUDE.md original

235bc50 — monitor.tsx

3476df0 — App.tsx v4.1.0 (análises + piloto + cotações)

## 📋 BACKLOG

🔴 P1: Rota /monitor no App.tsx | Resumo Executivo automático

🟡 P2: Feeds internacionais | Aumentar batchSize

🟢 P3: Integração QuantumCore/NeuroGrid | Web scraping | RAG no Dashboard

## 🚫 REGRAS (DO-178C)

1. NUNCA expor API keys no frontend
2. NUNCA remover funcionalidade sem confirmação
3. NUNCA modificar schema processed_news sem avisar (outros projetos dependem)
4. Máx 500 linhas/arquivo
5. Commits: feat/fix/docs/refactor: descrição
6. Claude Chat planeja → Claude Chrome commita
