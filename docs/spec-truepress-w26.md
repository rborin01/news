# SPEC: True Press W26 — Two-Fix Sprint

> Architect: Claude Opus | 2026-03-31
> Wave: W26 | Status: RED (tests written, implementation pending)

---

## Overview

Two targeted fixes for the True Press ecosystem:

1. **FIX 1** — Remove pagination limit from Friday `news.js` (2000 -> 5000)
2. **FIX 2** — Deploy `own_articles` table + fix OwnPressPanel canonical categories

---

## FIX 1: Remove pagination limit from Friday news.js

### Problem

`E:/IA/Claude/Friday/dashboard/pages/news.js` line 240 fetches with `&limit=2000`.
The database has 3,847+ articles and growing. Articles beyond 2000 are invisible.

### Solution

Replace `&limit=2000` with `&limit=5000`. This is a safe upper bound that avoids
pagination complexity in vanilla JS while covering all current and near-future articles.

### File Changed

| File | Line | Old | New |
|------|------|-----|-----|
| `E:/IA/Claude/Friday/dashboard/pages/news.js` | 240 | `&limit=2000` | `&limit=5000` |

### Risk

None. Supabase REST API handles limit=5000 without issue. Response size ~5MB for
5000 articles with the selected columns is well within browser memory.

---

## FIX 2: Deploy own_articles table + Canonical Categories in OwnPressPanel

### Problem A: own_articles table does not exist in Supabase

The migration file exists at:
`C:/Users/rodri/Meu Drive/Claude/TruePress/news-code/supabase/migrations/001_own_articles.sql`

But it has NOT been deployed. `GET /rest/v1/own_articles` returns 404.

### Solution A: Deploy via Supabase CLI

```bash
cd "C:/Users/rodri/Meu Drive/Claude/TruePress/news-code"
npx supabase db push --project-ref sfnvctljxidzueoutnxv
```

### Problem B: OwnPressPanel uses old 7-category array

`C:/Users/rodri/Meu Drive/Claude/TruePress/news-code/components/OwnPressPanel.tsx` line 5:
```typescript
const CATEGORIES = ['Agronegocio', 'Politica', 'Mercado Financeiro', 'Geopolitica', 'Tecnologia', 'Juridico', 'Outros'];
```

This violates the FORGE NON-NEGOTIABLE rule: all 17 canonical categories must be used.

### Solution B: Import CANONICAL_CATEGORIES from types.ts

**Line 3 (add import):**
```typescript
import { CANONICAL_CATEGORIES } from '../types';
```

**Line 5 (delete old constant):**
Remove the entire `const CATEGORIES = [...]` line.

**Line 49 (update default state):**
```typescript
const [category, setCategory] = useState(CANONICAL_CATEGORIES[0]);
```

**Line 130 (update dropdown render):**
```typescript
{CANONICAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
```

### Verification

After deployment:
- `GET https://sfnvctljxidzueoutnxv.supabase.co/rest/v1/own_articles?select=id&limit=1` returns 200
- OwnPressPanel dropdown shows all 17 canonical categories
- 'Tecnologia & IA' appears (not old 'Tecnologia')

---

## Files Changed Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `E:/IA/Claude/Friday/dashboard/pages/news.js` | MODIFY | 1 (limit value) |
| `C:/.../components/OwnPressPanel.tsx` | MODIFY | 4 (import, remove const, state default, dropdown) |
| Supabase DB (remote) | DEPLOY | Run migration 001_own_articles.sql |

## Tests

File: `C:/.../tests/e2e/w26-no-limit-own-articles.spec.ts`

| Test | What it validates |
|------|-------------------|
| `Friday loads > 2000 articles` | FIX 1 — limit=5000 means all 3847+ articles load |
| `own_articles table exists in Supabase` | FIX 2A — migration deployed successfully |
| `OwnPressPanel renders canonical category dropdown` | FIX 2B — 17 categories, not old 7 |

## Success Criteria

- [ ] All 3 tests pass GREEN after executor implements
- [ ] No regressions in existing E2E tests (7/7 from W25)
- [ ] All 17 canonical categories preserved exactly as-is
