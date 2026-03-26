# True Press V4 — Specification

> Version: 4.0 | Date: 2026-03-26
> Stack: React 19 + TypeScript + Vite + Supabase (sfnvctljxidzueoutnxv) + Vercel
> Analysis: Groq llama-3.1-8b-instant | Embeddings: Gemini embedding-001
> Edge Function: gemini-proxy (249L)

---

## 1. Scope

V4 has two delivery tracks:

| Track | Name | What it does |
|-------|------|-------------|
| **Part 1** | Bug Fixes + Refactor | Fix syntax error, split Dashboard.tsx, add queue stats widget, score filter slider, re-analyze button |
| **Part 2** | Own Press (Minha Imprensa) | New tab for original journalism: topic research, AI article generation, own_articles table |

---

## 2. Part 1 — Bug Fixes and Refactoring

### 2.1 Fix: App.tsx Syntax Error (Line 234)

**Problem**: Line 234 of `App.tsx` contains a stray character `h` after the semicolon: `persistNewsItems(newNews);h`

**Fix**: Remove the stray `h`. The corrected line should read:
```typescript
await persistNewsItems(newNews);
```

**File**: `App.tsx` (464 lines — stays under 500)

### 2.2 Fix: "Analise indisponivel" for Old Records

**Problem**: Records processed before the analysis prompt included `narrative_media`, `hidden_intent`, `real_facts`, and `impact_rodrigo` show "Analise indisponivel" because those fields are empty strings or null in `processed_news`.

**Solution**: Add a "Re-analyze" button on `NewsCard.tsx` that:
1. Calls `callGeminiProxy('analyze_news', { title, content_raw })` for the item's raw_id
2. Updates the `processed_news` row with the new analysis fields
3. Refreshes the card in-place

**New prop on NewsCard**: `onReanalyze?: (rawId: string) => Promise<void>`

**Service function** (add to `newsQueue.ts`):
```typescript
export async function reanalyzeItem(rawId: string): Promise<ProcessedNewsItem | null>
```
- Fetches `raw_news` row by id
- Calls `callGeminiProxy('analyze_news', ...)` with its title + content_raw
- Updates `processed_news` row where `raw_id = rawId`
- Returns the updated row

**Detection logic**: In `NewsCard.tsx`, if `item.narrative` is empty AND `item.intent` is empty AND `item.truth` is empty, show an amber badge "Analise pendente" + a button "Re-analisar" instead of the analysis section.

### 2.3 Dashboard.tsx Split

**Current state**: 569 lines. OVER the 500-line limit.

**Split plan**:

#### File 1: `components/Dashboard.tsx` (refactored, ~195 lines)
Keeps:
- Lines 1-52: imports, DashboardProps interface, component declaration, state
- Lines 53-179: hooks (useEffect, useMemo, handlers) — BUT remove CommandCenter-specific handlers
- Lines 180-196: `<Sidebar>` wrapper
- Lines 197-300: Main content area (`<main>`) with view toggles, search filter, executive summary, news list, investigations, data room
- Lines 513-569: Modals (OllamaHelp, DeepAnalysis, NeuralBridge, NewsModal)
- Replaces lines 303-512 with `<CommandCenter ... />`

New imports added:
```typescript
import { CommandCenter } from './CommandCenter';
```

#### File 2: `components/CommandCenter.tsx` (new, ~280 lines)
Extracts:
- Lines 303-512 of current Dashboard.tsx (right sidebar content)
- All state that only CommandCenter uses: `showModelMenu`, `showOllamaHelp`, `localModels`, `isOllamaOnline`, `isScraperOnline`, `isCloudMode`, `isHttpsBlock`
- Handlers: `toggleProvider`
- NEW: Queue stats widget (Section 2.4)
- NEW: Score filter slider (Section 2.5)

#### CommandCenter Props Interface

```typescript
interface CommandCenterProps {
  // View state
  viewMode: 'media' | 'ai' | 'data';

  // AI config
  aiConfig: AIConfig;
  setAiConfig: (c: AIConfig) => void;

  // Status
  memoryStatus: string | null;
  loading: boolean;

  // Actions
  onRefreshCommodities: (aiConfig: AIConfig) => void;
  onDeepScan?: () => void;
  onOpenSystemMonitor: () => void;

  // Auto pilot
  autoRadar: boolean;
  toggleAutoRadar: () => void;
  autoPilotStatus: string;

  // Deep analysis
  externalQuery: string;
  setExternalQuery: (q: string) => void;
  onDeepAnalysis: () => void;

  // Manual refresh
  onManualRefresh: () => void;

  // Neural bridge
  onOpenNeuralBridge: () => void;

  // Commodities data
  commodities: CommodityForecast[];

  // RAG
  ragStatus: any;
  onRagIndex: () => void;
  onRagSearch: (query: string) => Promise<any[]>;

  // News (for chart)
  allNews: NewsAnalysis[];

  // Queue stats (NEW)
  queueStats: QueueStats | null;

  // Score filter (NEW)
  minScoreRodrigo: number;
  setMinScoreRodrigo: (v: number) => void;
}
```

### 2.4 Queue Stats Widget (in CommandCenter)

Add between "System Core" (section 2) and "Commodities" (section 3) in CommandCenter.

**Data source**: `queueStats` prop (already fetched in `App.tsx` after pipeline runs via `getQueueStats()`).

**Enhancement in App.tsx**: Also fetch queue stats on initial load (inside the `useEffect` that calls `fetchProcessedNews`), and on a 60-second interval while `autoRadar` is true.

**Widget design**:
```
[FILA DE PROCESSAMENTO]
 Pendentes: 42 (amber badge)
 Processando: 3 (blue badge, animated pulse)
 Concluidos: 1,234 (green badge)
 Erros: 7 (red badge, clickable to reset)
```

Clicking the "Erros" badge calls `callGeminiProxy('reset_errors', { max_retry: 3 })` and refreshes stats.

**Line budget**: ~40 lines within CommandCenter.

### 2.5 Score Filter Slider (in CommandCenter)

Add inside the "Painel Tatico" section of CommandCenter, below the search input.

**Design**:
```
[SCORE RODRIGO >= 65]
<-------|-------> slider (0-100)
```

**State**: `minScoreRodrigo` (number, default 0) — lives in Dashboard, passed to CommandCenter as prop, also used in `filteredNews` useMemo.

**Filter logic** (modify `filteredNews` useMemo in Dashboard.tsx):
```typescript
// After existing relevance filters, add:
result = result.filter(item => (item.relevanceScore || 0) >= minScoreRodrigo);
```

This replaces/supplements the existing `minPersonalRelevance` filter in the sidebar. The CommandCenter slider is the primary UX for score filtering.

---

## 3. Part 2 — Own Press (Minha Imprensa)

### 3.1 Database: own_articles Table

```sql
CREATE TABLE own_articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  topic text NOT NULL,
  headline text NOT NULL,
  lede text NOT NULL,
  body text NOT NULL,
  sources text[] DEFAULT '{}',
  category text DEFAULT 'Geral',
  author_ai text DEFAULT 'TruePress AI',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS policy: anon can read published, service_role can do everything
ALTER TABLE own_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_published" ON own_articles FOR SELECT USING (status = 'published');
CREATE POLICY "service_all" ON own_articles FOR ALL USING (true) WITH CHECK (true);
```

**Columns added beyond task brief**:
- `status` — lifecycle management (draft/published/archived)
- `updated_at` — track edits

### 3.2 Edge Function: generate_article Action

Add new action block to `supabase/functions/gemini-proxy/index.ts` (currently 249 lines, will grow to ~310 lines — under 500).

**Input**:
```json
{
  "action": "generate_article",
  "topic": "Impacto da seca no preco da soja em MS",
  "research_context": "optional background text, URLs, data points"
}
```

**Prompt design** (Groq llama-3.1-8b-instant):
```
Voce e um jornalista investigativo brasileiro premiado.
Escreva um artigo original sobre o topico abaixo.

REGRAS:
- Headline: max 100 chars, impactante, sem clickbait
- Lede: 1-2 frases que resumem o essencial (quem, o que, quando, onde)
- Body: 3-5 paragrafos, tom serio e factual, sem opiniao explicita
- Sources: liste as fontes primarias que DEVERIAM ser consultadas (URLs ou nomes)
- Category: uma de [Agronegocio, Politica, Economia, Tecnologia, Geopolitica, Seguranca, Saude, Geral]

CONTEXTO DE PESQUISA (se disponivel):
{research_context}

TOPICO: {topic}

RETORNE APENAS JSON VALIDO:
{"headline":"...","lede":"...","body":"...","sources":["..."],"category":"..."}
```

**Server-side logic**:
1. Call Groq with the prompt
2. Parse JSON response
3. Insert into `own_articles` table via Supabase client
4. Return `{ id, headline, lede, body, sources, category }`

**Error handling**: If Groq returns invalid JSON, retry once. If still invalid, return error 500.

### 3.3 Service: services/ownPressService.ts (~80 lines)

```typescript
import { supabase, callGeminiProxy } from './supabaseClient';

export interface OwnArticle {
  id: string;
  topic: string;
  headline: string;
  lede: string;
  body: string;
  sources: string[];
  category: string;
  author_ai: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export async function generateArticle(
  topic: string,
  researchContext?: string
): Promise<OwnArticle>

export async function listOwnArticles(
  limit?: number,
  status?: string
): Promise<OwnArticle[]>

export async function updateArticleStatus(
  id: string,
  status: 'draft' | 'published' | 'archived'
): Promise<void>

export async function deleteArticle(id: string): Promise<void>
```

**Implementation notes**:
- `generateArticle` calls `callGeminiProxy('generate_article', { topic, research_context })`
- `listOwnArticles` queries `own_articles` ordered by `created_at DESC`
- `updateArticleStatus` updates the `status` and `updated_at` columns
- `deleteArticle` deletes the row (hard delete)

### 3.4 Component: components/OwnPressPanel.tsx (~250 lines)

**Layout** (fills the same main content area as Dashboard's news list):

```
+--------------------------------------------------+
| [GERAR ARTIGO]                                    |
| Topic input: [________________________] [GERAR]   |
| Research context (optional textarea, collapsible) |
+--------------------------------------------------+
| Loading state: "Pesquisando e escrevendo..."      |
+--------------------------------------------------+
| ARTIGOS GERADOS (lista)                           |
| +----------------------------------------------+ |
| | HEADLINE                           [draft]   | |
| | Lede text preview...                         | |
| | 2026-03-26 14:32 | Agronegocio | TruePress AI| |
| | [VER] [PUBLICAR] [EXCLUIR]                   | |
| +----------------------------------------------+ |
| | ...                                          | |
+--------------------------------------------------+
```

**State**:
- `topic: string` — input for article generation
- `researchContext: string` — optional textarea
- `showResearchCtx: boolean` — toggle for textarea visibility
- `generating: boolean` — loading state
- `articles: OwnArticle[]` — list of own articles
- `selectedArticle: OwnArticle | null` — expanded view
- `statusFilter: 'all' | 'draft' | 'published' | 'archived'`

**Article detail view**: When clicking "VER", expand inline (not modal) showing full body with formatted paragraphs, sources list, and action buttons (Publish / Archive / Delete).

### 3.5 Tab System

**Current state**: Dashboard has 3 view mode buttons (PRESS WATCH, AI ORIGINALS, DATA ROOM) inside the top bar (lines 209-216 of Dashboard.tsx).

**V4 change**: Add a TOP-LEVEL tab bar ABOVE the existing view toggles. This separates the two major sections:

```
+--------------------------------------------+
| [INTELIGENCIA]  |  [MINHA IMPRENSA]        |  <-- NEW top-level tabs
+--------------------------------------------+
| [PRESS WATCH] [AI ORIGINALS] [DATA ROOM]   |  <-- existing (only when INTELIGENCIA active)
| ...                                        |
+--------------------------------------------+
```

**Implementation in App.tsx**:
- New state: `activeTab: 'intelligence' | 'ownpress'` (default: 'intelligence')
- When `activeTab === 'intelligence'`: render `<Dashboard ... />` as today
- When `activeTab === 'ownpress'`: render `<OwnPressPanel />`
- The tab bar lives in App.tsx, ABOVE the Dashboard/OwnPressPanel

**Tab bar component**: Inline in App.tsx (10-15 lines of JSX), not a separate file.

**Visual design**:
```typescript
<div className="flex border-b border-slate-200 bg-white px-6">
  <button
    onClick={() => setActiveTab('intelligence')}
    className={`px-6 py-3 text-sm font-bold border-b-2 transition ${
      activeTab === 'intelligence'
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-slate-400 hover:text-slate-600'
    }`}
  >
    INTELIGENCIA
  </button>
  <button
    onClick={() => setActiveTab('ownpress')}
    className={`px-6 py-3 text-sm font-bold border-b-2 transition ${
      activeTab === 'ownpress'
        ? 'border-amber-600 text-amber-600'
        : 'border-transparent text-slate-400 hover:text-slate-600'
    }`}
  >
    MINHA IMPRENSA
  </button>
</div>
```

---

## 4. File Size Constraints

All files MUST stay under 500 lines. Current and projected sizes:

| File | Current | After V4 | Status |
|------|---------|----------|--------|
| `App.tsx` | 464 | ~490 | OK (tab state + OwnPressPanel import + tab bar JSX) |
| `components/Dashboard.tsx` | 569 | ~195 | OK (CommandCenter extracted) |
| `components/CommandCenter.tsx` | new | ~280 | OK |
| `components/OwnPressPanel.tsx` | new | ~250 | OK |
| `services/ownPressService.ts` | new | ~80 | OK |
| `services/newsQueue.ts` | 137 | ~165 | OK (reanalyzeItem added) |
| `supabase/functions/gemini-proxy/index.ts` | 249 | ~310 | OK (generate_article action) |
| `types.ts` | 251 | ~270 | OK (OwnArticle type if shared) |
| `components/NewsCard.tsx` | existing | +15 | OK (re-analyze button) |

---

## 5. Types

Add to `types.ts` (or keep in `ownPressService.ts` only — prefer co-location since OwnArticle is only used by OwnPressPanel and its service):

```typescript
// Already defined in ownPressService.ts, re-export if needed elsewhere
export type { OwnArticle } from '../services/ownPressService';
```

---

## 6. Dependency Changes

No new npm dependencies required. Everything uses existing:
- `@supabase/supabase-js` (already installed)
- `lucide-react` (already installed)
- `react` 19 (already installed)

---

## 7. Git Commit Plan

Execute in order. Each commit is a single atomic deliverable.

| # | Commit Message | Files Changed |
|---|---------------|---------------|
| 1 | `fix(app): remove stray character on line 234` | `App.tsx` |
| 2 | `refactor(dashboard): extract CommandCenter to separate component` | `Dashboard.tsx`, `CommandCenter.tsx` (new) |
| 3 | `feat(queue): add queue stats widget to CommandCenter` | `CommandCenter.tsx`, `App.tsx` |
| 4 | `feat(filter): add score_rodrigo slider to CommandCenter` | `CommandCenter.tsx`, `Dashboard.tsx` |
| 5 | `feat(reanalyze): add re-analyze button for old records` | `NewsCard.tsx`, `newsQueue.ts` |
| 6 | `feat(ownpress): add own_articles table migration` | SQL migration file |
| 7 | `feat(ownpress): add generate_article action to edge function` | `gemini-proxy/index.ts` |
| 8 | `feat(ownpress): add ownPressService and OwnPressPanel` | `ownPressService.ts` (new), `OwnPressPanel.tsx` (new) |
| 9 | `feat(tabs): add top-level tab system (Intelligence / Own Press)` | `App.tsx` |

---

## 8. Success Criteria

- [ ] No syntax errors in App.tsx (stray 'h' removed)
- [ ] Dashboard.tsx is under 500 lines
- [ ] CommandCenter.tsx exists and renders the right sidebar
- [ ] Queue stats widget shows pending/done/error counts with colored badges
- [ ] Score filter slider filters news by score_rodrigo threshold
- [ ] Old records without analysis show "Re-analisar" button that triggers Groq re-analysis
- [ ] own_articles table exists in Supabase with RLS policies
- [ ] generate_article action in gemini-proxy returns valid article JSON
- [ ] OwnPressPanel generates articles via topic input and lists them
- [ ] Tab bar switches between Intelligence Hub and Own Press views
- [ ] All files under 500 lines
- [ ] `npm run build` passes with zero errors
- [ ] App deploys to Vercel without regressions

---

## 9. Out of Scope (V4)

These are NOT part of V4 delivery:

- Article editing/WYSIWYG (future: V5)
- Public-facing article pages with SEO (future: V5)
- Multi-author support (future: V5)
- Article scheduling/auto-publish (future: V5)
- Image generation for articles (future: V5)
- Social media sharing integration (future: V5)
- RSS feed output for own articles (future: V5)
