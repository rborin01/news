# True Press — BLUEPRINT V5.0
## Intelligence Hub + Índices Borin Engine
> Version: 5.0 | Date: 2026-04-03 | Status: PLANNING
> Author: Rodrigo Borin | Methodology: FORGE (Engenheiro Sem Código)

---

## TESE CENTRAL

True Press não é um leitor de notícias. É um **motor de inteligência** que:
1. Captura fluxo global de informação (79 feeds RSS)
2. Analisa com IA (narrativa, intenção oculta, fatos reais, impacto pessoal)
3. Pontua por relevância pessoal (score_rodrigo) e nacional (score_brasil)
4. Alimenta 6 negócios (AgroVision, QuantumCore, NeuroHealth, NeuroGrid, NeuroSoft, PulsAI)
5. **[V5 NEW]** Alimenta os 9 Índices Borin do livro "A Engenharia da Prosperidade"
6. Publica artigos originais via Minha Imprensa (own_articles)

---

## ARQUITETURA ATUAL (V4.1 — FROZEN)

```
RSS Feeds (79) → ingest_rss (Edge Fn, cron */30min) → raw_news (pending)
→ process_queue (cron */35min, batch=10) → Claude Haiku analyze
→ processed_news (pgvector, ~5.000 artigos)
→ [news.rodrigoborin.com] React Dashboard (4 views)
→ [friday.rodrigoborin.com] Friday news.js (tpFetchAll)
```

### Stack V4.1
| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind |
| Backend | Supabase (sfnvctljxidzueoutnxv) + pgvector |
| Análise | Claude Haiku (edge function gemini-proxy) |
| Embeddings | Gemini embedding-001 (768 dims) |
| Deploy | Vercel (auto-deploy on push to main) |
| Cron | Supabase cron (não depende do site ficar aberto) |

### Views V4.1
| View | Função |
|------|--------|
| PRESS WATCH | Feed principal de notícias + filtros por categoria/score |
| AI ORIGINALS | Artigos gerados pela IA com deep analysis |
| DATA ROOM | Dossiês + Business Intelligence + [V5: Índices Borin] |
| MINHA IMPRENSA | Geração de artigos originais + own_articles |

---

## V5 — O QUE MUDA

### Conexão com "A Engenharia da Prosperidade"

O livro tem **9 Índices Borin** que precisam de dados primários e crus.
True Press V5 torna-se o **motor de dados** do livro.

```
processed_news → [tagger] → índice_tags (qual índice cada notícia alimenta)
processed_news → [aggregator] → borin_indices_daily (snapshot diário por índice)
borin_indices_daily → [DATA ROOM / Livro ESC no Friday] → gráficos + análise
```

### 9 Índices Borin → Categorias de Interesse

| Índice | Sigla | Categorias True Press que alimentam |
|--------|-------|-------------------------------------|
| Inflação Real | IIR | Economia & Finanças, Agronegócio & Commodities, Energia |
| Eficiência Fiscal | IREF | Política & STF, Economia & Finanças |
| Custo da Regulação | ICR | Negócios & Empreendedorismo, Política & STF |
| Governança Efetiva | IGE | Política & STF, Segurança, Infraestrutura & Imobiliário |
| Conformidade Normativa | ICN | Política & STF, Segurança, Liberdade & Censura |
| Adaptabilidade Nacional | IAN | Tecnologia & IA, Negócios & Empreendedorismo |
| Mentalidade de Prosperidade | IMP | Economia & Finanças, Negócios & Empreendedorismo |
| Custo da Desconfiança | ICD | Segurança, Economia & Finanças, Política & STF |
| Prosperidade Real (unificador) | IPR | Todos (score composto) |

---

## ROADMAP V5 (Waves 34-45)

### FASE 1 — Índices Borin Engine (W34-W36)

#### W34 — Índice Tagger
- Campo `borin_index_tags` em `processed_news` (array de siglas: `["IIR","IREF"]`)
- Lógica: mapeamento automático via category + keywords no título/summary
- Edge Function: nova action `tag_borin_indices` em gemini-proxy
- Fallback: regras determinísticas (não precisa de LLM para tagging básico)

#### W35 — Borin Indices Daily Snapshot
- Nova tabela: `borin_indices_daily`
  ```sql
  CREATE TABLE borin_indices_daily (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date date NOT NULL,
    index_code text NOT NULL, -- IIR, IREF, etc.
    article_count integer,
    avg_score_rodrigo numeric(5,2),
    avg_score_brasil numeric(5,2),
    top_articles uuid[],  -- top 3 artigo IDs
    sentiment_label text, -- positive/negative/neutral
    snapshot_at timestamptz DEFAULT now()
  );
  ```
- Cron: consolidação diária às 23:50 (Supabase pg_cron)
- Endpoint: `GET /rest/v1/borin_indices_daily?date=eq.{date}`

#### W36 — DATA ROOM Índices Panel
- Novo painel no DATA ROOM: "Índices Borin Live"
- 9 cards (um por índice): artigos do dia, score médio, sentimento, top artigo
- Gráfico de linhas: evolução 30 dias de cada índice (dados do snapshot diário)
- Drill-down: clicar no índice → lista de artigos taggeados

### FASE 2 — Intelligence Upgrade (W37-W40)

#### W37 — Entity Extraction (Países)
- Campo `countries_mentioned` em `processed_news` (array: `["BR","US","CN"]`)
- Edge Function: extrai países do título + summary com Claude Haiku
- Permite: filtro de notícias por país + feed do IPR cross-country

#### W38 — Cofre L4 (Intelligence Vault)
- Artigos marcados como `level_4_restricted = true` não aparecem no feed público
- Acesso somente após autenticação Supabase (não anon key)
- Use case: dossiês sensíveis para pesquisa do livro, informações confidenciais
- UI: cadeado no card + seção "COFRE" separada no DATA ROOM

#### W39 — Resumo Executivo Automático
- Gerado automaticamente ao abrir o app (se não há resumo do dia)
- Claude Haiku: consolida top 10 artigos com score_rodrigo ≥ 70
- Salvo em `executive_summaries` table com `date` + `content` + `audio_url`
- UI: painel colapsável no topo do PRESS WATCH

#### W40 — Voice Intelligence
- TTS: ElevenLabs API (ou Web Speech API como fallback gratuito)
- Botão "OUVIR" nos artigos e no Resumo Executivo (já existe no wireframe da tela)
- Audio gerado pela Edge Function → armazenado em Supabase Storage
- Cache: não regera se áudio já existe para aquele artigo

### FASE 3 — Book Integration (W41-W43)

#### W41 — Book Research Mode
- Novo filtro: "Modo Livro" — mostra apenas artigos com borin_index_tags não vazio
- Busca integrada: "Quais artigos desta semana alimentam o índice IREF?"
- Export: gerar PDF semanal com artigos por índice (pesquisa do livro)

#### W42 — Cross-Reference Engine
- Detecta quando 2+ artigos falam da mesma história em países diferentes
- UI: "Ver perspectivas internacionais" no card do artigo
- Alimenta o IPR (Índice de Prosperidade Real) com dados cross-country

#### W43 — Borin Score Badge
- Cada artigo ganha badge visual com os índices que alimenta
- Exemplo: artigo sobre inflação → badge `IIR` + `IREF`
- Permite ao Rodrigo ver instantaneamente a relevância para o livro

### FASE 4 — Platform Maturity (W44-W45)

#### W44 — Weekly Report PDF
- Gerado toda segunda-feira (cron)
- Conteúdo: top 20 artigos, resumo por índice, progresso dos negócios
- Enviado por email ou disponível em `/reports`
- Formato: PDF gerado server-side (puppeteer ou jsPDF)

#### W45 — Mobile PWA V2
- Notificações push quando score_rodrigo ≥ 80
- Offline: últimos 50 artigos cached no Service Worker
- Widget home screen: score atual do dia + índice mais ativo

---

## SCHEMA EVOLUTION V5

### Campos novos em `processed_news`
```sql
ALTER TABLE processed_news
  ADD COLUMN borin_index_tags text[] DEFAULT '{}',
  ADD COLUMN countries_mentioned text[] DEFAULT '{}',
  ADD COLUMN level_4_restricted boolean DEFAULT false;
```

### Nova tabela `borin_indices_daily`
```sql
CREATE TABLE borin_indices_daily (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  index_code text NOT NULL CHECK (index_code IN ('IIR','IREF','ICR','IGE','ICN','IAN','IMP','ICD','IPR')),
  article_count integer DEFAULT 0,
  avg_score_rodrigo numeric(5,2),
  avg_score_brasil numeric(5,2),
  top_articles uuid[],
  sentiment_label text CHECK (sentiment_label IN ('positive','negative','neutral','mixed')),
  snapshot_at timestamptz DEFAULT now(),
  UNIQUE (date, index_code)
);
```

### Nova tabela `executive_summaries`
```sql
CREATE TABLE executive_summaries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date UNIQUE NOT NULL,
  content text NOT NULL,
  audio_url text,
  article_ids uuid[],
  generated_at timestamptz DEFAULT now()
);
```

---

## REGRAS NON-NEGOTIABLE (V4 → V5, herdadas)

1. **17 categorias canônicas** — NUNCA alterar (ver CLAUDE.md)
2. **processed_news schema** — qualquer alteração avisa projetos dependentes (QuantumCore, NeuroGrid, AgroVision, Friday)
3. **API key nunca no frontend** — sempre via Edge Function
4. **Máx 500 linhas/arquivo** — splits obrigatórios
5. **Cron server-side** — site não precisa ficar aberto
6. **[V5 NEW]** `borin_index_tags` é calculado automaticamente, NUNCA manualmente pelo usuário
7. **[V5 NEW]** Cofre L4 exige autenticação Supabase real (não anon key)

---

## DEPENDÊNCIAS EXTERNAS

| Sistema | Como depende do True Press |
|---------|--------------------------|
| QuantumCore | `level_2_project = 'QuantumCore'` em processed_news |
| NeuroGrid | `level_2_project = 'NeuroGrid'` em processed_news |
| AgroVision | `level_2_project = 'AgroVision'` em processed_news |
| NeuroHealth | `level_2_project = 'NeuroHealth'` em processed_news |
| NeuroSoft | `level_2_project = 'NeuroSoft'` em processed_news |
| PulsAI | `level_2_project = 'PulsAI'` em processed_news |
| Friday Dashboard | Direct REST API, tpFetchAll pagination |
| Livro ESC (Friday) | borin_indices_daily snapshots |
| "A Engenharia da Prosperidade" | book_research_mode + weekly PDF export |

---

## ESTADO V4.1 (FROZEN — não mexer)

| Wave | Entregue | Testes |
|------|---------|--------|
| W25-W29 | Categories, Claude API, ATUALIZAR, IntelDashboard | 9/9 |
| W30 | Score filter, queue stats | 5/5 |
| W31 | Resumo Executivo manual + auto | 4/4 |
| W32 | Search autocomplete | 17/17 |
| W33 | Piloto Automático server-side | 7/7 |
| W26b | tpFetchAll pagination | 3/3 |
| analysis-quality | Deep analysis 4 fields | 7/7 |
| intelligence.spec | Intel Dashboard | 10/10 |
| own-press.spec | Minha Imprensa | 9/9 |
| **TOTAL** | **76/76 GREEN** | |
