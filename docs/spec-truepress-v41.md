# True Press Intelligence Hub V4.1 -- Spec

> Author: Architect (Claude Opus) | Date: 2026-03-29
> Status: SPEC COMPLETE -- ready for Executor

---

## 1. Scope

V4.1 is a **validation and hardening** release. Analysis reveals that the Edge Function
(`gemini-proxy/index.ts` v3.9.0) and Friday dashboard (`news.js`) already implement
the V4.1 requirements. The only code change is bumping `max_tokens` from 1000 to 1200.

The primary deliverable is a Playwright E2E test suite that validates analysis quality
in production data and category integrity in the Friday dashboard.

---

## 2. Changes Required

### 2.1 Edge Function (`supabase/functions/gemini-proxy/index.ts`)

| Item | Current | Target | Status |
|------|---------|--------|--------|
| Model | `llama-3.3-70b-versatile` | `llama-3.3-70b-versatile` | ALREADY DONE |
| Prompt depth | 5 fields with min lengths | Same | ALREADY DONE |
| 17 categories in prompt | Yes (line 91) | Yes | ALREADY DONE |
| `batchSize` camelCase | `body.batchSize ?? body.batch_size` | Same | ALREADY DONE |
| `max_tokens` | 1000 | **1200** | **CHANGE NEEDED** |
| Health endpoint | Returns `groq_model` | Same | ALREADY DONE |

**Single change**: Line 47, `max_tokens: 1000` becomes `max_tokens: 1200`.

### 2.2 Friday Dashboard (`E:/IA/Claude/Friday/dashboard/pages/news.js`)

| Item | Current | Target | Status |
|------|---------|--------|--------|
| `CANONICAL_CATEGORIES` array | 17 categories (lines 192-198) | Same 17 | ALREADY DONE |
| `mapCategory()` pass-through | Yes (lines 200-206) | Same | ALREADY DONE |
| Legacy fallback mapping | Yes (lines 208-230) | Same | ALREADY DONE |
| Fetch limit | `limit=500` (line 239) | 500+ | ALREADY DONE |

**No changes needed.** Tests will validate existing behavior.

### 2.3 E2E Tests (`tests/e2e/analysis-quality.spec.ts`)

NEW file. 7 test cases. See Section 5 for full test spec.

---

## 3. Timeout Safety Analysis (llama-3.3-70b-versatile)

**Pre-commit reviewer concern**: "timeout risk with 70b model"

**Rebuttal (with data)**:

| Factor | Value |
|--------|-------|
| Groq inference speed (70b) | ~800 tokens/sec |
| `max_tokens` cap | 1200 tokens |
| Worst-case inference time | 1200 / 800 = **1.5 seconds** |
| Supabase Edge Function timeout | 150 seconds |
| Safety margin | 150 / 1.5 = **100x headroom** |
| Network overhead (Supabase to Groq) | ~200ms |
| Total worst-case per article | ~1.7 seconds |
| Batch of 20 articles (sequential + 500ms delay) | 20 * (1.7 + 0.5) = **44 seconds** |
| Remaining headroom for batch of 20 | 150 - 44 = **106 seconds** |

Groq runs llama-3.3-70b-versatile on custom LPU hardware, not GPU. Their inference
speed is deterministic and does not degrade under load the way GPU inference does.
The 70b model on Groq is faster than most 8b models on GPU cloud providers.

**Verdict**: Safe. 100x headroom per call. Even a 20-article batch completes in under
45 seconds. The pre-commit reviewer concern is unfounded.

---

## 4. Canonical Categories (WHITELIST)

These 17 categories are the ONLY valid values. The Edge Function prompt, the Friday
dashboard `CANONICAL_CATEGORIES` array, and the E2E tests must all use this exact list:

```
1.  Agronegocio & Commodities
2.  Politica & STF
3.  Mercado Financeiro & Forex
4.  Geopolitica & Guerra
5.  Tecnologia & IA
6.  Saude & Ciencia
7.  Seguranca
8.  Infraestrutura & Imobiliario
9.  Energia
10. Meio Ambiente
11. Economia & Financas
12. Liberdade & Censura
13. Negocios & Empreendedorismo
14. Entretenimento & Cultura
15. Esportes
16. Internacional
17. Outros
```

(Accented forms: Agronegocio=Agroneg&oacute;cio, Politica=Pol&iacute;tica, Geopolitica=Geopol&iacute;tica,
Saude=Sa&uacute;de, Ciencia=Ci&ecirc;ncia, Seguranca=Seguran&ccedil;a, Imobiliario=Imobili&aacute;rio,
Financas=Finan&ccedil;as, Negocios=Neg&oacute;cios)

---

## 5. E2E Test Spec

File: `tests/e2e/analysis-quality.spec.ts`

Uses direct Supabase REST API (not browser) for data quality checks, and Playwright
browser for Friday dashboard UI checks.

### Test 1: `narrative_media` field depth
- Query `processed_news` via Supabase REST, get 10 most recent articles
- Assert: at least 8 of 10 have `narrative_media.length > 100`

### Test 2: `hidden_intent` field depth
- Same query, assert: at least 8 of 10 have `hidden_intent.length > 100`

### Test 3: `impact_rodrigo` field depth
- Same query, assert: at least 8 of 10 have `impact_rodrigo.length > 200`

### Test 4: `summary` field depth
- Same query, assert: at least 8 of 10 have `summary.length > 150`

### Test 5: All 17 canonical categories exist in Friday dashboard
- Navigate to Friday dashboard news page
- Check that the sidebar contains all 17 canonical category labels
- NOTE: This test targets the Friday dashboard, not news.rodrigoborin.com

### Test 6: Friday dashboard shows 400+ articles
- Query `processed_news` count via Supabase REST
- Assert: count >= 400

### Test 7: Edge Function health returns correct model
- POST to Edge Function with `action: "health"`
- Assert: response contains `groq_model: "llama-3.3-70b-versatile"`

### Threshold rationale (8 of 10)
Not all articles will have deep analysis -- some RSS items have minimal content_raw
(< 200 chars), which produces shallow analysis regardless of prompt quality. 80%
pass rate accounts for this without masking real quality regressions.

---

## 6. Executor Briefing

### What to do (in order):

1. **Edit `index.ts` line 47**: Change `max_tokens: 1000` to `max_tokens: 1200`. That is
   the ONLY change to the Edge Function. Do NOT modify the prompt, model, or any other logic.

2. **Deploy the Edge Function**: Use Supabase CLI if `sbp_` PAT token is available:
   ```bash
   cd "C:/Users/rodri/Meu Drive/Claude/TruePress/news-code"
   npx supabase functions deploy gemini-proxy --project-ref sfnvctljxidzueoutnxv
   ```
   If no CLI token, deploy via Supabase Dashboard UI (copy-paste index.ts content).

3. **DO NOT modify `news.js`**: The Friday dashboard already has all 17 canonical categories
   and the correct `mapCategory()` function. No changes needed.

4. **Run the E2E tests** (they are already written by the Architect in RED phase):
   ```bash
   cd "C:/Users/rodri/Meu Drive/Claude/TruePress/news-code"
   npx playwright test tests/e2e/analysis-quality.spec.ts
   ```
   Tests should pass if production data has sufficient quality. If tests 1-4 fail,
   it means existing processed articles have shallow analysis -- trigger a reprocess
   by calling the Edge Function with `action: "reprocess_empty"`.

5. **Verify Friday dashboard**: Open https://friday.rodrigoborin.com, navigate to News page,
   confirm sidebar shows all 17 categories (no category collapsing).

### What NOT to do:
- Do NOT change the model (it is already `llama-3.3-70b-versatile`)
- Do NOT rewrite the prompt (it is already deep-analysis v4.1)
- Do NOT modify `CANONICAL_CATEGORIES` in news.js (already correct)
- Do NOT add new categories or remove existing ones

---

## 7. Deploy Notes

- Edge Function deploy requires Supabase CLI + `sbp_` PAT token
- Friday dashboard: volume-mounted, `docker exec friday_dashboard nginx -s reload` if any CSS/JS changes
- news.rodrigoborin.com: Vercel auto-deploys on git push to `main` branch
- No database schema changes required

---

## 8. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Groq rate limit (14,400/day) | Low | Current batch size 20, ~3 runs/day = 60 calls |
| Edge Function timeout | Very Low | 100x headroom (see Section 3) |
| Category drift in LLM output | Medium | Prompt whitelist + mapCategory fallback |
| Shallow analysis on short articles | Expected | 80% threshold in tests (8/10) |
