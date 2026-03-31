# Executor Briefing: W25 — True Press Category Unification

> Architect: Claude Opus | Date: 2026-03-31
> Tests: `tests/e2e/category-unification.spec.ts` (5 tests, all RED)
> Spec: `docs/spec-truepress-w25.md`

---

## INSTRUCTIONS

You are the Executor. Implement EXACTLY the changes below. Do NOT modify test files.
Do NOT add features. Do NOT refactor beyond what is specified. Make the RED tests GREEN.

---

## FIX 1 — Friday limit=500 to limit=2000

**File**: `E:/IA/Claude/Friday/dashboard/pages/news.js`
**Line**: 239
**Current**:
```js
tpFetch('processed_news', 'select=id,raw_id,title,summary,narrative_media,hidden_intent,real_facts,impact_rodrigo,category,level_1_domain,level_2_project,level_3_tag,score_rodrigo,score_brasil,processed_at,source_app&order=processed_at.desc&limit=500')
```
**Change**: Replace `limit=500` with `limit=2000`

---

## FIX 2 — mapCategory pipe-split normalization

**File**: `E:/IA/Claude/Friday/dashboard/pages/news.js`
**Line**: 200-201 (inside `function mapCategory(cat)`)
**Current** (line 201):
```js
if (!cat) return 'Outros';
```
**Change**: Add pipe-split AFTER the null check, BEFORE the exact match:
```js
function mapCategory(cat) {
  if (!cat) return 'Outros';
  cat = cat.split('|')[0].trim();   // <-- ADD THIS LINE
  // Se ja e canonica, retorna direto (sem remapear)
  var found = CANONICAL_CATEGORIES.find(function(c) {
```

This ensures `"Politica & STF|Mercado Financeiro & Forex"` becomes `"Politica & STF"` before any matching.

---

## FIX 3A — Replace DEFAULT_CATEGORIES in types.ts

**File**: `C:/Users/rodri/Meu Drive/Claude/TruePress/news-code/types.ts`
**Lines**: 230-250

**Delete** the entire current `DEFAULT_CATEGORIES` array (lines 230-250).
**Replace with**:
```typescript
// CANONICAL CATEGORIES — 17 categories, NON-NEGOTIABLE (see CLAUDE.md)
export const CANONICAL_CATEGORIES = [
  'Agronegócio & Commodities',
  'Política & STF',
  'Mercado Financeiro & Forex',
  'Geopolítica & Guerra',
  'Tecnologia & IA',
  'Saúde & Ciência',
  'Segurança',
  'Infraestrutura & Imobiliário',
  'Energia',
  'Meio Ambiente',
  'Economia & Finanças',
  'Liberdade & Censura',
  'Negócios & Empreendedorismo',
  'Entretenimento & Cultura',
  'Esportes',
  'Internacional',
  'Outros',
];

// Backward compat alias
export const DEFAULT_CATEGORIES = CANONICAL_CATEGORIES;
```

---

## FIX 3B — Normalize allNews categories in Dashboard.tsx

**File**: `C:/Users/rodri/Meu Drive/Claude/TruePress/news-code/components/Dashboard.tsx`
**Line**: 2 (import) — update import to include CANONICAL_CATEGORIES:
```typescript
import { IntelligenceReport, NewsAnalysis, ExternalAnalysisResult, AiInvestigation, MarketSentiment, RawDataResult, DEFAULT_CATEGORIES, CANONICAL_CATEGORIES, AIConfig, OllamaModel } from '../types';
```

**Lines**: 101-105 — Replace the `categories` useMemo with:
```typescript
  // Normalize pipe-separated categories at data boundary
  const normalizedNews = useMemo(() => {
    return allNews.map(n => ({
      ...n,
      category: n.category?.split('|')[0]?.trim() || 'Outros',
    }));
  }, [allNews]);

  const categories = useMemo(() => {
    return ['Todos', ...CANONICAL_CATEGORIES];
  }, []);
```

---

## FIX 3C — Use normalizedNews instead of allNews for filtering

**File**: `C:/Users/rodri/Meu Drive/Claude/TruePress/news-code/components/Dashboard.tsx`
**Lines**: 107-114 — Update `filteredNews` useMemo to use `normalizedNews` instead of `allNews`:
```typescript
  const filteredNews = useMemo(() => {
    let result = normalizedNews;
    const effectiveCategory = selectedCategory === 'IA' ? 'Tecnologia & IA' : selectedCategory;
    if (effectiveCategory !== 'Todos') result = result.filter(item => item.category === effectiveCategory);
    if (searchQuery) result = result.filter(item => item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || item.narrative?.toLowerCase().includes(searchQuery.toLowerCase()));
    result = result.filter(item => (item.relevanceScore || 0) >= minPersonalRelevance && (item.nationalRelevance || 0) >= minNationalRelevance);
    result = result.filter(item => (item.relevanceScore || 0) >= minScoreRodrigo);
    return result.sort((a, b) => relevanceMode === 'personal' ? (b.relevanceScore || 0) - (a.relevanceScore || 0) : (b.nationalRelevance || 0) - (a.nationalRelevance || 0));
  }, [normalizedNews, selectedCategory, searchQuery, minPersonalRelevance, minNationalRelevance, relevanceMode, minScoreRodrigo]);
```

Key changes in filteredNews:
1. Uses `normalizedNews` instead of `allNews`
2. Adds `effectiveCategory` alias: `'IA' -> 'Tecnologia & IA'`
3. Uses strict equality (`===`) instead of `.includes()` for category matching (canonical = clean data)
4. Dependencies updated to include `normalizedNews`

---

## FIX 4 — IA quick-filter alias (already included in FIX 3C above)

The line `const effectiveCategory = selectedCategory === 'IA' ? 'Tecnologia & IA' : selectedCategory;` handles the IA alias. No additional changes needed.

---

## DEPLOYMENT

After implementing all fixes:

1. **React app**: Build and deploy to Vercel/hosting:
   ```bash
   cd "C:/Users/rodri/Meu Drive/Claude/TruePress/news-code"
   npm run build
   ```

2. **Friday dashboard**: The news.js changes take effect on next page load (no build needed, it is vanilla JS served statically).

3. **Run tests**:
   ```bash
   cd "C:/Users/rodri/Meu Drive/Claude/TruePress/news-code"
   npx playwright test tests/e2e/category-unification.spec.ts --reporter=list
   ```

4. All 5 tests must pass GREEN.

---

## FILES CHANGED (summary)

| # | File | Type | Change |
|---|------|------|--------|
| 1 | `E:/IA/Claude/Friday/dashboard/pages/news.js` | MODIFY | limit=2000, pipe-split in mapCategory |
| 2 | `C:/.../TruePress/news-code/types.ts` | MODIFY | Replace DEFAULT_CATEGORIES with CANONICAL_CATEGORIES |
| 3 | `C:/.../TruePress/news-code/components/Dashboard.tsx` | MODIFY | normalizedNews, canonical sidebar, IA alias |

Total: 3 files modified, ~30 lines changed.
