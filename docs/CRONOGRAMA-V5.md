# True Press V5 — Cronograma Completo
> Gerado: 2026-04-03 | Metodologia: FORGE | Pipeline: Architect → Executor → Tester
> Status legend: ⬜ Pendente | 🔄 Em progresso | ✅ Concluído | ❌ Bloqueado

---

## VISÃO GERAL

| Fase | Waves | Objetivo | Status |
|------|-------|----------|--------|
| F1 — Índices Borin Engine | W34-W36 | True Press como motor de dados do livro | ✅ COMPLETA |
| F2 — Intelligence Upgrade | W37-W40 | Cofre, resumo auto, voz | ⬜ |
| F3 — Book Integration | W41-W43 | Modo pesquisa, cross-reference, badges | ⬜ |
| F4 — Platform Maturity | W44-W45 | PDF semanal, PWA push | ⬜ |

---

## ✅ BASELINE V4.1 (FROZEN — não mexer)

- ✅ 79 feeds RSS ativos (ingest_rss cron */30min)
- ✅ process_queue cron */35min (batch=10, Claude Haiku)
- ✅ processed_news ~5.000 artigos (pgvector, 768 dims)
- ✅ 17 categorias canônicas unificadas (Friday + news.rodrigoborin.com)
- ✅ tpFetchAll pagination (Range headers — bypass cap 1000)
- ✅ IntelDashboard: 6 negócios (AgroVision, QuantumCore, NeuroHealth, NeuroGrid, NeuroSoft, PulsAI)
- ✅ Piloto Automático server-side (cron Supabase)
- ✅ SearchAutocomplete, Score filter slider, Queue stats
- ✅ own_articles table + Minha Imprensa
- ✅ 76/76 testes E2E GREEN
- ✅ Friday: W36 Livro ESC + W37 Minha Imprensa 3 abas + True Press bugs

---

## FASE 1 — Índices Borin Engine (W34-W36)
> Objetivo: conectar True Press aos 9 Índices do livro "A Engenharia da Prosperidade"

### W34 — Índice Tagger ✅ APPROVED 9/10 (2026-04-03)
> Adiciona `borin_index_tags` em cada artigo processado (determinístico, sem custo LLM)

#### Tasks de Banco
- ✅ **W34.1** — Migration: `003_borin_index_tags.sql` — ADD COLUMN borin_index_tags text[]
- ✅ **W34.2** — Index: GIN index idx_processed_borin_tags
- ✅ **W34.3** — RLS: herda policy existente

#### Tasks de Edge Function
- ✅ **W34.4** — `tag_borin_indices` action em gemini-proxy (single + batch)
- ✅ **W34.5** — BORIN_TAG_MAP: 17 categorias canônicas mapeadas
- ✅ **W34.6** — processQueue hook: taga após INSERT, antes de status=done

#### Tasks de Backfill
- ✅ **W34.7** — `004_backfill_borin_tags.sql` — CASE/WHEN SQL puro para todos os artigos
- ✅ **W34.8** — Mapeamento verificado pelo Reviewer

#### Tasks de Teste
- ✅ **W34.9** — `tests/e2e/w34-borin-tagger.spec.ts` (8 testes):
  - Novo artigo de "Economia & Finanças" → tags ['IIR','IREF','IMP','ICD']
  - Novo artigo de "Política & STF" → tags incluem 'IGE'
  - Artigo de "Outros" → tags = []
  - IPR gerado se categoria mapeia múltiplos índices
  - Backfill não sobrescreve tags já preenchidas
  - Filtro por borin_index_tags retorna artigos corretos
  - Edge Function tag_borin_indices retorna 200
  - process_queue novo artigo tem borin_index_tags preenchido

---

### W35 — Índices Daily Snapshot ✅ APPROVED 9/10 (2026-04-03)
> Consolida snapshot diário por índice para visualização histórica

#### Tasks de Banco
- ✅ **W35.1** — Migration: `005_borin_indices_daily.sql` — table + RLS + indexes
  ```sql
  CREATE TABLE borin_indices_daily (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date date NOT NULL,
    index_code text NOT NULL CHECK (index_code IN ('IIR','IREF','ICR','IGE','ICN','IAN','IMP','ICD','IPR')),
    article_count integer DEFAULT 0,
    avg_score_rodrigo numeric(5,2),
    avg_score_brasil numeric(5,2),
    top_articles uuid[],
    sentiment_label text,
    snapshot_at timestamptz DEFAULT now(),
    UNIQUE (date, index_code)
  );
  ```
- ⬜ **W35.2** — RLS: anon pode SELECT borin_indices_daily
- ⬜ **W35.3** — Index: `CREATE INDEX idx_borin_daily_date ON borin_indices_daily(date DESC)`

#### Tasks de Edge Function
- ⬜ **W35.4** — `snapshot_borin_daily()` action em gemini-proxy:
  - Para cada índice: COUNT artigos do dia com aquele tag
  - Calcula avg_score_rodrigo, avg_score_brasil
  - Seleciona top 3 artigos (maior score_rodrigo)
  - Classifica sentimento: se avg_score_rodrigo > 65 → positive, < 40 → negative, senão → mixed
  - UPSERT em borin_indices_daily (date=CURRENT_DATE, index_code)
- ✅ **W35.5** — Cron SQL gerado: net.http_post às 23:50 UTC (borin-daily-snapshot)

#### Tasks de Teste
- ✅ **W35.6** — `tests/e2e/w35-borin-snapshot.spec.ts` (6 testes + beforeAll + import):
  - snapshot_borin_daily cria 9 linhas (uma por índice)
  - IIR conta apenas artigos com 'IIR' em borin_index_tags
  - avg_score calculado corretamente
  - UPSERT não duplica mesma data+índice
  - top_articles contém uuid válidos
  - RLS anon pode ler snapshots

---

### W36 — DATA ROOM Índices Panel ✅ APPROVED 10/10 (2026-04-03)
> UI no news.rodrigoborin.com: 9 cards de índice + gráfico histórico

#### Tasks de Frontend
- ✅ **W36.1** — `IndicesBorinPanel.tsx` — 243L: 9 cards, data-testids, empty state
- ✅ **W36.2** — `IndicesBorinChart.tsx` — 121L: Recharts LineChart + toggles
- ✅ **W36.3** — `IndicesBorinDrilldown.tsx` — 146L: .contains() filter, close btn
- ✅ **W36.4** — Dashboard.tsx integrado (import + JSX no viewMode==='data')
- ✅ **W36.5** — Dark-theme Tailwind consistente com IntelDashboard

#### Tasks de Teste
- ✅ **W36.6** — `tests/e2e/w36-indices-panel.spec.ts` (7 testes):
  - Panel renderiza 9 cards de índice
  - Card exibe article_count e avg_score
  - Click num card abre drilldown com artigos
  - Chart renderiza linhas com dados
  - Toggle de índice adiciona/remove linha do chart
  - Panel mostra "Sem dados" quando snapshot não existe
  - Integração: DATA ROOM view mostra painel quando tab ativa

---

## FASE 2 — Intelligence Upgrade (W37-W40)

### W37 — Entity Extraction (Países) ⬜

#### Tasks
- ⬜ **W37.1** — Migration: `ADD COLUMN countries_mentioned text[] DEFAULT '{}'`
- ⬜ **W37.2** — Edge Function: `extract_countries()` action — Claude Haiku extrai países do título+summary (ISO 3166-1 alpha-2)
- ⬜ **W37.3** — Integrar no process_queue após analyze_news
- ⬜ **W37.4** — UI: filtro por país no PRESS WATCH (dropdown com bandeiras)
- ⬜ **W37.5** — Testes: `w37-countries.spec.ts` (5 testes)

---

### W38 — Cofre L4 (Intelligence Vault) ⬜

#### Tasks
- ⬜ **W38.1** — Migration: `ADD COLUMN level_4_restricted boolean DEFAULT false`
- ⬜ **W38.2** — RLS: artigos com level_4_restricted = true → exigem auth (não anon)
- ⬜ **W38.3** — UI: cadeado no NewsCard para marcar artigo como L4
- ⬜ **W38.4** — UI: seção "COFRE" separada no DATA ROOM (só aparece se autenticado)
- ⬜ **W38.5** — Supabase Auth: login modal para acesso ao Cofre
- ⬜ **W38.6** — Testes: `w38-cofre-l4.spec.ts` (5 testes)

---

### W39 — Resumo Executivo Automático ⬜

#### Tasks
- ⬜ **W39.1** — Migration: CREATE TABLE executive_summaries (date, content, audio_url, article_ids)
- ⬜ **W39.2** — Edge Function: `generate_executive_summary()` — top 10 artigos score ≥ 70 → Claude Haiku → resumo
- ⬜ **W39.3** — Cron: gerar resumo às 08:00 todo dia
- ⬜ **W39.4** — UI: painel colapsável no topo do PRESS WATCH
- ⬜ **W39.5** — Cache: não regenerar se já existe resumo do dia
- ⬜ **W39.6** — Testes: `w39-resumo-auto.spec.ts` (5 testes)

---

### W40 — Voice Intelligence (TTS) ⬜

#### Tasks
- ⬜ **W40.1** — Edge Function: `generate_tts()` action — Web Speech API ou ElevenLabs
- ⬜ **W40.2** — Storage: armazenar áudio em Supabase Storage (bucket `audio`)
- ⬜ **W40.3** — UI: botão "OUVIR" no Resumo Executivo (já existe no wireframe)
- ⬜ **W40.4** — UI: botão "OUVIR" em cada NewsCard (play inline)
- ⬜ **W40.5** — Cache: reutiliza áudio já gerado (não regenera)
- ⬜ **W40.6** — Testes: `w40-voice.spec.ts` (4 testes)

---

## FASE 3 — Book Integration (W41-W43)

### W41 — Book Research Mode ⬜

#### Tasks
- ⬜ **W41.1** — UI: toggle "Modo Livro" no PRESS WATCH (filtra por borin_index_tags não vazio)
- ⬜ **W41.2** — Busca integrada: "Artigos que alimentam índice X esta semana"
- ⬜ **W41.3** — Export PDF: gerar PDF semanal de artigos por índice
- ⬜ **W41.4** — Dossiê: agrupar artigos por capítulo do livro (Caps 1-28)
- ⬜ **W41.5** — Testes: `w41-book-mode.spec.ts` (4 testes)

---

### W42 — Cross-Reference Engine ⬜

#### Tasks
- ⬜ **W42.1** — Algoritmo: detectar artigos sobre o mesmo evento em países diferentes (embeddings + título similarity)
- ⬜ **W42.2** — UI: "Ver perspectivas internacionais" no NewsCard (se cross-refs existem)
- ⬜ **W42.3** — IPR feed: agrupar cross-refs por par de países (base para índice cross-country)
- ⬜ **W42.4** — Testes: `w42-cross-reference.spec.ts` (4 testes)

---

### W43 — Borin Score Badge ⬜

#### Tasks
- ⬜ **W43.1** — UI: badges visuais de índice no NewsCard (ex: `IIR` `IREF` quando artigo tem borin_index_tags)
- ⬜ **W43.2** — Cores por índice: cada sigla tem cor distinta (palette definida)
- ⬜ **W43.3** — Tooltip: hover no badge → explicação do índice
- ⬜ **W43.4** — Filtro: clicar no badge filtra por aquele índice no feed
- ⬜ **W43.5** — Testes: `w43-badges.spec.ts` (4 testes)

---

## FASE 4 — Platform Maturity (W44-W45)

### W44 — Weekly Report PDF ⬜

#### Tasks
- ⬜ **W44.1** — Edge Function: `generate_weekly_report()` — jsPDF ou Puppeteer
- ⬜ **W44.2** — Conteúdo: top 20 artigos + resumo por índice + progresso negócios
- ⬜ **W44.3** — Cron: toda segunda às 07:00
- ⬜ **W44.4** — Storage: salvar em Supabase Storage + link de download no dashboard
- ⬜ **W44.5** — Testes: `w44-weekly-report.spec.ts` (3 testes)

---

### W45 — Mobile PWA V2 ⬜

#### Tasks
- ⬜ **W45.1** — Push notifications: quando score_rodrigo ≥ 80 (Web Push API)
- ⬜ **W45.2** — Offline cache: últimos 50 artigos via Service Worker
- ⬜ **W45.3** — Home screen widget: score do dia + índice mais ativo
- ⬜ **W45.4** — Testes: `w45-pwa.spec.ts` (3 testes)

---

## RESUMO DE TASKS

| Wave | Tasks | Banco | Edge Fn | Frontend | Testes |
|------|-------|-------|---------|---------|--------|
| W34 | 9 | 3 | 3 | 0 | 1 |
| W35 | 6 | 3 | 2 | 0 | 1 |
| W36 | 6 | 0 | 0 | 4 | 1 |
| W37 | 5 | 1 | 1 | 1 | 1 |
| W38 | 6 | 2 | 0 | 3 | 1 |
| W39 | 6 | 1 | 1 | 2 | 1 |
| W40 | 6 | 0 | 1 | 3 | 1 |
| W41 | 5 | 0 | 0 | 4 | 1 |
| W42 | 4 | 0 | 1 | 2 | 1 |
| W43 | 5 | 0 | 0 | 4 | 1 |
| W44 | 5 | 0 | 1 | 1 | 1 |
| W45 | 4 | 0 | 0 | 3 | 1 |
| **TOTAL** | **67** | **10** | **10** | **27** | **12** |

---

## ORDEM DE IMPLEMENTAÇÃO FORGE

```
W34 → W35 → W36   (F1 em sequência — cada um depende do anterior)
W37, W38, W39     (F2 primeiros 3 — podem ser paralelos)
W40               (F2 — depende de executive_summaries de W39)
W41, W42, W43     (F3 — podem ser paralelos)
W44, W45          (F4 — paralelos)
```

**Próximo**: `/forge:plan W34` — Architect planeja Índice Tagger
