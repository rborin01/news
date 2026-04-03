# True Press — DESIGN DOC V5.0
## Decisões técnicas, problemas resolvidos, histórico completo
> Version: 5.0 | Date: 2026-04-03 | Author: Rodrigo Borin

---

## 1. VISÃO DO PRODUTO

True Press é o **sistema nervoso central** do ecossistema Rodrigo Borin.

- **Para o leitor**: notícias sem viés, com narrativa oculta exposta
- **Para os negócios**: inteligência de mercado personalizada por empresa
- **Para o livro**: dados primários e crus que alimentam os 9 Índices Borin
- **Para a pesquisa**: dossiê probatório de fatos vs narrativa midiática

### Por que existir?

Problema: toda mídia tem narrativa. Você não sabe quem se beneficia da história que você lê.

Solução: True Press usa IA para extrair 4 camadas de cada notícia:
1. `narrative_media` — o que a mídia quer que você pense
2. `hidden_intent` — quem se beneficia e por quê
3. `real_facts` — o que realmente aconteceu
4. `impact_rodrigo` — impacto específico para os negócios e vida de Rodrigo

---

## 2. HISTÓRICO DE FASES

### Fase 1 — Protótipo AI Studio (fev/2026)
- React 19 + TypeScript + IndexedDB local
- Gemini API direto no frontend (key exposta — problema)
- 60 notícias manuais, RAG IndexedDB
- **Problema crítico**: API key exposta, dados só no browser

### Fase 2 — Migração Supabase (fev/2026)
- Supabase PostgreSQL + pgvector substituindo IndexedDB
- Edge Function `gemini-proxy` como proxy seguro (API key saiu do frontend)
- Tabelas: `raw_news` + `processed_news` + `snapshots`
- 37 feeds RSS, cron automático (site não precisa ficar aberto)
- **Problema resolvido**: segurança + persistência

### Fase 3 — Pipeline Estável (mar/2026)
- 79 feeds RSS (de 20 → 79)
- Rate limiting 4.2s entre calls Gemini
- Throughput: ~17 notícias/hora | ~400/dia
- Cron duplo: ingest_rss (*/30min) + process_queue (*/35min)

### Fase 4 — V4.1 One Page (mar/2026 — W25-W33)
- Groq → Claude Haiku (sem limite diário)
- 17 categorias canônicas unificadas (Friday + news.rodrigoborin.com)
- tpFetchAll: Range headers para bypass do cap 1000 do Supabase REST
- IntelDashboard: Business Intelligence por negócio
- SearchAutocomplete: busca interna com sugestões
- Piloto Automático server-side (não precisa manter a aba aberta)
- 76/76 testes E2E GREEN
- ~5.000 artigos no processed_news

---

## 3. DECISÕES DE ARQUITETURA

### 3.1 Edge Function como único ponto de acesso ao Gemini/Claude
**Decisão**: Toda chamada de IA passa pela Edge Function `gemini-proxy`.
**Por quê**: API keys nunca expostas no frontend. Vercel não teria acesso ao segredo.
**Trade-off**: latência +200ms por hop. Aceito — segurança > velocidade.

### 3.2 Supabase pgvector (não Pinecone, não Qdrant)
**Decisão**: Embeddings no PostgreSQL via pgvector.
**Por quê**: custo zero (plano free), SQL nativo, sem serviço extra.
**Trade-off**: escala limitada a ~1M vetores no free. Suficiente para 5 anos.

### 3.3 RSS (não web scraping como fonte primária)
**Decisão**: Feeds RSS como fonte primária de ingestion.
**Por quê**: sem bloqueios de IP, sem parsing frágil de HTML, atualizações em tempo real.
**Trade-off**: depende das fontes publicarem RSS. 79 feeds ativos = cobertura adequada.
**Fallback**: web scraping via `api/scrape.js` no Vercel (existe mas não é primário).

### 3.4 Claude Haiku (não Gemini Flash)
**Decisão**: Migrado de Groq → Claude Haiku em W27.
**Por quê**: Groq free tier tinha limite diário; Claude API ($200/mês) não tem limite operacional.
**Custo estimado**: ~2.000 artigos/dia × $0.00025/1k tokens ≈ $1/dia.

### 3.5 3 Níveis de Classificação
**Decisão**: `level_1_domain` + `level_2_project` + `level_3_tag`
**Por quê**: uma tag única colapsaria semânticamente (ex: "IA" pode ser AgroVision + NeuroSoft).
**Como funciona**:
- `level_1` = domínio amplo (Finance_Trading, Politics, Agro, Tech...)
- `level_2` = projeto (QuantumCore, NeuroGrid, AgroVision, NeuroSoft, NeuroHealth, PulsAI, TruePress)
- `level_3` = tag snake_case granular (trade_war, interest_rates, ai_regulation...)

### 3.6 tpFetchAll com Range Headers
**Decisão**: Paginação via RFC 7233 Range headers (não via limit/offset).
**Por quê**: Supabase PostgREST caps em 1000 linhas independente do `limit` parameter.
**Implementação**: `Range: 0-999`, `Range: 1000-1999`... até `Content-Range` indicar o total.

### 3.7 [V5] Borin Index Tagging — Determinístico primeiro, LLM depois
**Decisão**: Mapeamento categoria→índice é determinístico (regra fixa), não LLM.
**Por quê**: LLM custaria ~$0.001 por artigo só para tagging. Regras custam $0.
**Como**: `if category == 'Economia & Finanças' → tags.push('IIR', 'IREF', 'IMP')`
**Upgrade**: LLM só para artigos ambíguos (quando a categoria não é suficiente).

---

## 4. SCHEMA ATUAL (V4.1)

### `raw_news`
```sql
id uuid PK | url text UNIQUE | source text | title text
content_raw text | scraped_at timestamptz | status text (pending/processing/done/error)
```

### `processed_news` (compartilhado — não quebrar)
```sql
id uuid PK | raw_id uuid FK | title text | summary text
narrative_media text | hidden_intent text | real_facts text | impact_rodrigo text
category text (17 canônicas) | level_1_domain text | level_2_project text | level_3_tag text
score_rodrigo integer (0-100) | score_brasil integer (0-100)
embedding vector(768) | processed_at timestamptz | source_app text
```

### `own_articles` (Minha Imprensa)
```sql
id uuid PK | title text | content text | category text | status text
author text | created_at timestamptz | published_at timestamptz
```

### Snapshots (análise histórica)
```sql
snapshots: id, date, stats_json, top_articles_json
```

---

## 5. CAMPOS V5 (a adicionar)

```sql
-- Em processed_news:
borin_index_tags text[] DEFAULT '{}'    -- ['IIR','IREF','ICD']
countries_mentioned text[] DEFAULT '{}' -- ['BR','US','CN'] (ISO 3166-1 alpha-2)
level_4_restricted boolean DEFAULT false

-- Novas tabelas:
borin_indices_daily (date, index_code, article_count, avg_score_rodrigo, ...)
executive_summaries (date, content, audio_url, article_ids)
```

---

## 6. EDGE FUNCTION — ACTIONS ATUAIS (V4.2)

| Action | O que faz |
|--------|-----------|
| `generate` | Gera texto livre com Claude Haiku (Resumo Executivo) |
| `embed` | Gera embedding vector(768) com Gemini embedding-001 |
| `analyze_news` | 4-field analysis: narrative/intent/facts/impact + scores + levels |
| `process_queue` | Processa batch de raw_news pending → analyzed processed_news |
| `ingest_rss` | Fetch 79 feeds RSS → insere raw_news deduplicado por URL |
| `save` | INSERT em processed_news (interno) |
| `search` | Busca semântica via match_processed_news_filtered() |

### Actions V5 a adicionar:
| Action | O que faz |
|--------|-----------|
| `tag_borin_indices` | Adiciona borin_index_tags a artigos processados |
| `extract_countries` | Identifica países mencionados no artigo |
| `snapshot_borin_daily` | Consolida borin_indices_daily do dia |
| `generate_executive_summary` | Resumo executivo do dia com top artigos |

---

## 7. INTEGRAÇÃO COM "A ENGENHARIA DA PROSPERIDADE"

### Os 9 Índices Borin e sua fonte de dados no True Press

```
IIR (Inflação Real) ← artigos de Economia & Finanças + Agronegócio
IREF (Eficiência Fiscal) ← artigos de Política & STF + Economia
ICR (Custo da Regulação) ← artigos de Negócios & Empreendedorismo
IGE (Governança Efetiva) ← artigos de Política & STF + Segurança
ICN (Conformidade Normativa) ← artigos de Política & STF + Liberdade & Censura
IAN (Adaptabilidade Nacional) ← artigos de Tecnologia & IA + Negócios
IMP (Mentalidade de Prosperidade) ← artigos de Economia & Negócios
ICD (Custo da Desconfiança) ← artigos de Segurança + Economia
IPR (Prosperidade Real) ← score composto de todos
```

### Por que True Press é mais valioso que fontes públicas para o livro?

Fontes públicas (World Bank, WVS, Hofstede) têm dados anuais ou de surveys quinquenais.
True Press tem dados **diários**, **em português**, **com análise de intenção oculta**.

Isso permite ao livro:
- "Em fevereiro/2026, a narrativa midiática sobre inflação foi X, mas os fatos apontam Y"
- Dossiê probatório (Protocolo Omega do livro) com artigos taggeados por índice
- Validação qualitativa dos índices quantitativos

---

## 8. PROBLEMAS CONHECIDOS E SOLUÇÕES

| Problema | Status | Solução |
|---------|--------|---------|
| Artigos com "Análise indisponível" | Resolvido (W31) | Botão re-analisar |
| Cap 1000 linhas Supabase REST | Resolvido (W26b) | tpFetchAll Range headers |
| Limite diário Groq | Resolvido (W27) | Claude Haiku ($200/mês) |
| API key exposta frontend | Resolvido (Fase 2) | Edge Function proxy |
| 9 feeds RSS quebrados | Resolvido (Fase 2) | 79 feeds validados |
| Categorias divergentes Friday vs site | Resolvido (W25) | 17 canônicas + mapCategory() |
| "ATUALIZADO" mostra horário de carregamento | Resolvido (S48) | max(processed_at) |
| "0 artigos hoje" com timezone | Resolvido (S48) | 24h rolling UTC-safe |

---

## 9. TESTES E2E (V4.1 — estado atual)

```
tests/e2e/
├── w27-w29-unification.spec.ts  — 9/9 GREEN
├── w30-score-queue.spec.ts      — 5/5 GREEN
├── w31-resumo-score.spec.ts     — 4/4 GREEN
├── w32-search.spec.ts           — 17/17 GREEN
├── w33-autopilot.spec.ts        — 7/7 GREEN
├── w26-pagination.spec.ts       — 3/3 GREEN
├── w25-categories.spec.ts       — 5/5 GREEN
├── analysis-quality.spec.ts     — 7/7 GREEN
├── intelligence.spec.ts         — 10/10 GREEN
└── own-press.spec.ts            — 9/9 GREEN
TOTAL: 76/76 GREEN
```

---

## 10. REGRAS DE OURO (imutáveis)

1. **API key nunca no frontend** (violação = security incident)
2. **17 categorias canônicas** — listadas em CLAUDE.md do Forge e neste doc
3. **Schema processed_news é API pública** — qualquer campo removido quebra QuantumCore/NeuroGrid/AgroVision/Friday
4. **Máx 500 linhas/arquivo** (FORGE rule)
5. **Cron server-side** — site não precisa ficar aberto para funcionar
6. **FORGE pipeline** — toda feature nova: Architect (Opus) → Executor (Sonnet) → Tester

---

## 11. PRÓXIMOS PASSOS V5 (priorizados)

| # | Wave | Prioridade | Impacto |
|---|------|-----------|---------|
| 1 | W34 — Borin Index Tagger | 🔴 P1 | Conecta True Press ao livro |
| 2 | W35 — Daily Snapshot | 🔴 P1 | Base para DATA ROOM V5 |
| 3 | W36 — DATA ROOM Índices Panel | 🔴 P1 | UI do livro no dashboard |
| 4 | W37 — Country Extraction | 🟡 P2 | IPR cross-country |
| 5 | W38 — Cofre L4 | 🟡 P2 | Inteligência privada |
| 6 | W39 — Resumo Executivo Auto | 🟡 P2 | Já existe botão na UI |
| 7 | W40 — Voice TTS | 🟢 P3 | "OUVIR" botão na UI |
| 8 | W41 — Book Research Mode | 🟢 P3 | Export para livro |
