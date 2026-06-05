# FORGE Plan — Friday ↔ True Press Integration
**Módulo:** friday-integration
**Data:** 2026-06-05
**Arquiteto:** Claude Opus 4.8

## Objetivo
Integração bidirecional entre True Press (fonte de inteligência) e Friday (plataforma agêntica).
- PULL: Friday consulta notícias da True Press por domínio/query/índice.
- PUSH: True Press notifica a Friday quando há notícia de alto impacto (score_brasil >= 80).

## Contexto existente
- Friday já consulta: `SELECT * FROM processed_news WHERE level_1_domain = 'Finance_Trading'`.
- RPC existente: `match_processed_news_filtered(query_embedding, threshold, count, domain, project, tag)`.
- Friday roda em n8n (friday.rodrigoborin.com), 86 workflows.
- True Press: Supabase sfnvctljxidzueoutnxv, 4.085 notícias processadas, 9 Índices Borin calculados.

## Arquitetura

### 1. PULL — Edge Function `friday-feed`
GET https://sfnvctljxidzueoutnxv.supabase.co/functions/v1/friday-feed
Query params: domain, limit, min_score, since, index_code
Retorna: JSON com notícias filtradas + índices Borin do período.
Auth: header `x-friday-key` (segredo compartilhado, não anon key).

### 2. PUSH — n8n workflow `06-friday-bridge`
Trigger: Schedule a cada 15min.
- Busca processed_news com score_brasil >= 80 processadas nos últimos 15min.
- POST para webhook da Friday: friday.rodrigoborin.com/webhook/truepress-alert.
- Payload: título, resumo, impacto, índices Borin afetados.

### 3. Client helper `services/fridayIntegration.ts`
Funções TypeScript para o frontend e para uso em scripts:
- `getFridayFeed(domain, opts)` — chama friday-feed
- `pushToFriday(article)` — dispara alerta manual
- Tipos: FridayFeedItem, FridayAlert

## Testes (FORGE — antes do código)
- friday-feed retorna apenas notícias do domínio pedido
- friday-feed respeita min_score
- friday-feed inclui índices Borin do período
- pushToFriday formata payload corretamente
- Sem secret key exposta no frontend

## Sequência
1. Edge Function friday-feed (deploy via dashboard)
2. n8n workflow 06-friday-bridge (import quando API key disponível)
3. services/fridayIntegration.ts (commit no repo)
4. Variável FRIDAY_WEBHOOK_URL + FRIDAY_SHARED_KEY no n8n env

## Custo: R$ 0
