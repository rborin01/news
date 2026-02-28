# CLAUDE.md — True Press Intelligence Hub

> Cole este arquivo no início de qualquer nova sessão Claude.

> Atualizado: 28/02/2026

## ENDPOINTS

- Site: https://news.rodrigoborin.com

- GitHub: https://github.com/rborin01/news

- Supabase SQL: https://supabase.com/dashboard/project/sfnvctljxidzueoutnxv/sql/new

- Edge Functions: https://supabase.com/dashboard/project/sfnvctljxidzueoutnxv/functions

- Cron Jobs: https://supabase.com/dashboard/project/sfnvctljxidzueoutnxv/integrations/cron/overview

- Vercel: https://vercel.com/rodrigos-projects-7f21a156/news

## STACK

React 19 + TypeScript + Vite + Tailwind | Gemini 2.0 Flash + text-embedding-004 | Supabase pgvector | Vercel

## SCHEMA CHAVE

raw_news: id, url(UNIQUE), source, title, content_raw, scraped_at, status(pending/processing/done/error), error_msg, retry_count

processed_news: id, raw_id, title, summary, narrative_media, hidden_intent, real_facts, impact_rodrigo, category, level_1_domain, level_2_project, level_3_tag, score_rodrigo, score_brasil, embedding vector(768), processed_at, source_app

## EDGE FUNCTION: gemini-proxy

Actions: generate | embed | analyze_news | process_queue | ingest_rss | save | search

Secrets: GEMINI_API_KEY ✅ | SUPABASE_URL ✅ | SUPABASE_SERVICE_ROLE_KEY ✅

## CRON (servidor — site não precisa ficar aberto)

true-press-pipeline: */30 min → {"action":"ingest_rss"}

true-press-process:  */35 min → {"action":"process_queue","batchSize":10}

## ARQUIVOS CHAVE

- App.tsx — Piloto Automático + inicialização Supabase

- services/supabaseClient.ts — callGeminiProxy + helpers (v4.0.2)

- services/newsQueue.ts — Pipeline RSS→Gemini→Supabase (v4.0.0)

- supabase/functions/gemini-proxy/index.ts — Edge Function

## ESTADO (28/02/2026)

raw_news: ~634 total | ~589 pending | ~35 done | processed_news: ~35

ETA fila: ~2 dias (rate limit Gemini free, 10/lote a cada 35min)

## INTEGRAÇÃO OUTROS PROJETOS

SELECT * FROM processed_news WHERE level_1_domain = 'Finance_Trading' ORDER BY processed_at DESC LIMIT 50;

SELECT * FROM processed_news WHERE level_1_domain = 'Agro' ORDER BY processed_at DESC LIMIT 50;

RPC: match_processed_news_filtered(query_embedding, threshold, count, domain, project, tag)

## REGRAS (DO-178C)

1. Nunca salvar local — tudo via GitHub web editor

2. Nunca remover funcionalidade sem confirmação

3. Nunca expor API keys no frontend

4. Máximo 500 linhas por arquivo

5. Commit: feat/fix/docs: descrição

## BACKLOG

- [ ] Fix: "Análise indisponível" no Dashboard (narrative_media não chega ao frontend)

- [ ] Feeds internacionais (Reuters RSS)

- [ ] Integração QuantumCore / NeuroGrid / AgroVision

- [ ] Web scraping complementar ao RSS
