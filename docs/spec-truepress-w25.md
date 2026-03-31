# SPEC: True Press Category Unification (W25)

> Architect: Claude Opus | Date: 2026-03-31
> Status: RED (tests written, implementation pending)

---

## Problem Statement

True Press has a category pollution problem across two frontends:

1. **Friday dashboard (news.js)**: `mapCategory()` does exact match but receives pipe-separated values like `"Politica & STF|Mercado Financeiro & Forex"` from Supabase. The exact match fails, fallback regex may misclassify, and the pipe-separated string leaks into the UI.

2. **Friday dashboard (news.js)**: `limit=500` truncates the dataset. True Press has 1500+ articles. Should be `limit=2000`.

3. **React app (Dashboard.tsx)**: Sidebar categories are built from dirty article data (`allNews.map(n => n.category)`), so pipe-separated values like `"Tecnologia & IA|Geopolitica & Guerra"` appear as sidebar items. Additionally, `DEFAULT_CATEGORIES` in `types.ts` uses legacy emoji-prefixed names (e.g., `"🚨 Manchetes & Alertas"`) that do NOT match the 17 canonical categories.

4. **React app (Dashboard.tsx)**: No "IA" quick-filter alias. Users expect to click "IA" and see `Tecnologia & IA` articles.

## Architecture Decisions

### AD-1: Pipe-split normalization at data boundary
Both `mapCategory()` in news.js and `allNews` processing in Dashboard.tsx must split on `|` and take the first value BEFORE any matching logic. This is a data-boundary normalization, not a display concern.

### AD-2: Canonical categories are the single source of truth
The 17 canonical categories (without emojis) defined in CLAUDE.md are NON-NEGOTIABLE. `DEFAULT_CATEGORIES` in `types.ts` must be replaced with the exact canonical list. The sidebar must render from this hardcoded list, not from article data.

### AD-3: IA alias is a filter-level concern
The "IA" shortcut maps to `"Tecnologia & IA"` at filter time. It is NOT a new category. Implementation: when `selectedCategory === 'IA'`, treat as `selectedCategory === 'Tecnologia & IA'`.

## 17 Canonical Categories (NON-NEGOTIABLE)

```
Agronegocio & Commodities
Politica & STF
Mercado Financeiro & Forex
Geopolitica & Guerra
Tecnologia & IA
Saude & Ciencia
Seguranca
Infraestrutura & Imobiliario
Energia
Meio Ambiente
Economia & Financas
Liberdade & Censura
Negocios & Empreendedorismo
Entretenimento & Cultura
Esportes
Internacional
Outros
```

## Files to Modify

| File | Change | Lines |
|------|--------|-------|
| `E:/IA/Claude/Friday/dashboard/pages/news.js` | FIX 1: `limit=500` -> `limit=2000` (line 239) | 1 |
| `E:/IA/Claude/Friday/dashboard/pages/news.js` | FIX 2: Add `cat = cat.split('\|')[0].trim()` as first line in `mapCategory()` (line 201) | 1 |
| `C:/Users/rodri/Meu Drive/Claude/TruePress/news-code/types.ts` | FIX 3A: Replace `DEFAULT_CATEGORIES` with `CANONICAL_CATEGORIES` (17 exact names, no emojis) | ~20 |
| `C:/Users/rodri/Meu Drive/Claude/TruePress/news-code/components/Dashboard.tsx` | FIX 3B: Normalize `allNews` categories via pipe-split in useMemo | ~5 |
| `C:/Users/rodri/Meu Drive/Claude/TruePress/news-code/components/Dashboard.tsx` | FIX 3C: Build sidebar from `CANONICAL_CATEGORIES` not from article data | ~5 |
| `C:/Users/rodri/Meu Drive/Claude/TruePress/news-code/components/Dashboard.tsx` | FIX 4: IA alias in filter logic | ~3 |

## Success Criteria

- [ ] `mapCategory("Politica & STF|Mercado Financeiro & Forex")` returns `"Politica & STF"`
- [ ] Friday dashboard shows > 500 articles (limit=2000)
- [ ] news.rodrigoborin.com sidebar has zero pipe-separated category names
- [ ] news.rodrigoborin.com sidebar shows all 17 canonical categories
- [ ] Clicking "IA" filter on news.rodrigoborin.com shows Tecnologia & IA articles
- [ ] All 5 E2E tests in `category-unification.spec.ts` pass GREEN

## Tests

File: `tests/e2e/category-unification.spec.ts`
Framework: Playwright (same config as existing tests)
All tests written RED — must fail now, pass after executor implements.
