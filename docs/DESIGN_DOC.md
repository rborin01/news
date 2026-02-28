# DESIGN DOC — True Press

## O QUE FOI PEDIDO E FEITO

### Fase 1 — Base do produto

✅ Dashboard de notícias com análise Gemini

✅ Autenticação AuthGate

✅ Piloto Automático manual

✅ Cotações no header (era estático)

✅ RagPanel + IndexedDB

### Fase 2 — Migração Supabase (27/02/2026)

✅ Tabelas raw_news + processed_news + snapshots

✅ Pipeline RSS → Gemini → Supabase

✅ Edge Function gemini-proxy

✅ pgvector + busca semântica 3 níveis

✅ Cron automático no servidor

✅ 20 feeds RSS válidos (9 quebrados substituídos)

✅ Fix embedding vazio → constraint error

✅ Verificação: 95 notícias processadas

### Fase 3 — Docs e Monitor (28/02/2026)

✅ CLAUDE.md no GitHub (commit 2aa814c)

✅ monitor.tsx (commit 235bc50)

### Fase 4 — Fixes Frontend (28/02/2026)

✅ "Análise indisponível" → campos corretos (commit 3476df0)

✅ adaptNewsFromSupabase() centralizada

✅ Piloto Automático sem "undefined"

✅ Cotações AwesomeAPI em tempo real

## PROBLEMAS RESOLVIDOS

1. Gemini JSON inválido → callGeminiJSON() com fallback regex

2. Embedding vazio → insert condicional (undefined se vazio)

3. 9 feeds RSS quebrados → 20 feeds válidos verificados

4. "Análise indisponível" → mapeamento correto n.narrative_media

5. "undefined" no piloto → result.ingested ?? 0

## BACKLOG PRIORIZADO

🔴 P1: Rota /monitor | Resumo Executivo automático

🟡 P2: Feeds internacionais | batchSize maior | docs no GitHub

🟢 P3: QuantumCore integração | NeuroGrid/AgroVision | Web scraping | RAG Dashboard

## DECISÕES PENDENTES (Rodrigo decide)

- Gemini Free (17/hora) vs Paid (600/hora)

- RSS manter vs adicionar web scraping

- Feeds internacionais: agora ou depois
