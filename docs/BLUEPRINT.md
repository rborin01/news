# BLUEPRINT — True Press v4.1.0

## PIPELINE

```
[Cron */30min] → ingest_rss → fetch 20 feeds → parse XML → dedup URL → INSERT raw_news (pending)
[Cron */35min] → process_queue → SELECT pending LIMIT 10 → Gemini analyze → embedding → INSERT processed_news → UPDATE done
[Frontend open] → fetchProcessedNews(100) → adaptNewsFromSupabase() → Dashboard
```

## ARQUITETURA 3 CAMADAS

```
Frontend (Vercel/React)
    ↓ supabase.functions.invoke() — Anon Key público
Edge Function (Supabase Deno) — gemini-proxy
    ↓ Gemini API Key (privado) + Service Role (privado)
Banco (Supabase PostgreSQL + pgvector)
    raw_news | processed_news | snapshots
```

## MAPEAMENTO CRÍTICO frontend → Supabase

```
n.narrative_media → narrative
n.hidden_intent   → intent
n.real_facts      → truth
n.impact_rodrigo  → action
n.score_rodrigo   → relevanceScore
n.score_brasil    → nationalRelevance
```

## RATE LIMITS

Gemini free: ~15 req/min → delay 4.2s entre calls

Throughput real: ~17 notícias/hora | ~400/dia

ETA fila (~589 pending): ~2 dias

## BUSCA SEMÂNTICA

```sql
SELECT * FROM match_processed_news_filtered(
  query_embedding := $vector,
  match_threshold := 0.7,
  match_count := 20,
  filter_domain  := 'Finance_Trading',
  filter_project := 'QuantumCore',
  filter_tag     := null
);
```

## DECISÕES DE ARQUITETURA

Gemini via Edge Function (não direto) → API key nunca exposta

Supabase pgvector (não Pinecone) → custo zero + simplicidade

Cron no servidor (não setInterval) → site não precisa ficar aberto

3 níveis de classificação (não tag única) → evita colapso semântico

RSS (não scraping) → confiabilidade + sem bloqueios

ivfflat index (não HNSW) → melhor para dataset < 100k
