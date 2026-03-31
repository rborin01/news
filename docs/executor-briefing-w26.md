# EXECUTOR BRIEFING: W26 — True Press Two-Fix Sprint

> Architect: Claude Opus | 2026-03-31
> Spec: `docs/spec-truepress-w26.md`
> Tests: `tests/e2e/w26-no-limit-own-articles.spec.ts` (3 tests, currently RED)

---

## YOUR MISSION

Implement exactly 3 changes to make all 3 RED tests pass GREEN. Nothing more.

---

## CHANGE 1: Friday news.js limit (1 line)

**File**: `E:/IA/Claude/Friday/dashboard/pages/news.js`
**Line**: 240

**Old string (EXACT)**:
```
&limit=2000
```

**New string (EXACT)**:
```
&limit=5000
```

That is the only change in this file. Do not touch anything else.

---

## CHANGE 2: Deploy own_articles migration

**Command**:
```bash
cd "C:/Users/rodri/Meu Drive/Claude/TruePress/news-code"
npx supabase db push --project-ref sfnvctljxidzueoutnxv
```

If `supabase` CLI is not installed or fails, run the SQL directly via Supabase Management API:
```bash
cd "C:/Users/rodri/Meu Drive/Claude/TruePress/news-code"
cat supabase/migrations/001_own_articles.sql
```
Then paste that SQL into Supabase SQL Editor at:
`https://supabase.com/dashboard/project/sfnvctljxidzueoutnxv/sql/new`

**Verify**: After deployment:
```bash
curl -s "https://sfnvctljxidzueoutnxv.supabase.co/rest/v1/own_articles?select=id&limit=1" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbnZjdGxqeGlkenVlb3V0bnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTI5OTcsImV4cCI6MjA4NzY4ODk5N30.Yg65dHXyZqzBWNHM1nW-YfBx7FWFpWyoFvM_Obj-wQI"
```
Expected: `[]` (empty array, HTTP 200). If 404 or error, table is not deployed.

---

## CHANGE 3: OwnPressPanel canonical categories (4 edits in 1 file)

**File**: `C:/Users/rodri/Meu Drive/Claude/TruePress/news-code/components/OwnPressPanel.tsx`

### Edit 3A: Add import (line 3)

**Old string**:
```typescript
import { OwnArticle, generateArticle, listOwnArticles, deleteOwnArticle } from '../services/ownPressService';
```

**New string**:
```typescript
import { OwnArticle, generateArticle, listOwnArticles, deleteOwnArticle } from '../services/ownPressService';
import { CANONICAL_CATEGORIES } from '../types';
```

### Edit 3B: Remove old CATEGORIES constant (line 5)

**Old string**:
```typescript
const CATEGORIES = ['Agronegócio', 'Política', 'Mercado Financeiro', 'Geopolítica', 'Tecnologia', 'Jurídico', 'Outros'];
```

**New string**:
```typescript
```
(Delete the entire line — replace with empty string / remove it)

### Edit 3C: Update default state (line 49)

**Old string**:
```typescript
  const [category, setCategory] = useState('Agronegócio');
```

**New string**:
```typescript
  const [category, setCategory] = useState(CANONICAL_CATEGORIES[0]);
```

### Edit 3D: Update dropdown render (line 130)

**Old string**:
```typescript
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
```

**New string**:
```typescript
                {CANONICAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
```

---

## NON-NEGOTIABLE RULES

1. Do NOT modify the 17 canonical categories in `types.ts` — they are frozen
2. Do NOT add or remove categories — use the import as-is
3. Do NOT change any other file besides the 2 listed above (+ Supabase deployment)
4. After all changes, run: `npx playwright test tests/e2e/w26-no-limit-own-articles.spec.ts --reporter=list`
5. All 3 tests must pass GREEN

---

## VERIFICATION CHECKLIST

- [ ] `news.js` line 240 says `&limit=5000`
- [ ] `curl` to `own_articles` returns HTTP 200 with `[]`
- [ ] `OwnPressPanel.tsx` imports `CANONICAL_CATEGORIES` from `'../types'`
- [ ] `OwnPressPanel.tsx` has NO local `CATEGORIES` constant
- [ ] Dropdown renders 17 options (not 7)
- [ ] All 3 E2E tests GREEN
- [ ] Existing 7 E2E tests still GREEN (no regressions)
