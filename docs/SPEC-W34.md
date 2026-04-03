# SPEC-W34: Indice Tagger (Borin Index Tags)

> Architect: Claude Opus | Date: 2026-04-03
> Status: RED (tests written, implementation pending)

---

## Summary

Add deterministic Borin Index Tags to every processed article. Tags are based on the article's `category` field using a fixed mapping (NO LLM calls). This enables filtering articles by economic/geopolitical indices.

## Index Definitions

| Tag  | Meaning                          |
|------|----------------------------------|
| IIR  | Indice de Impacto Rodrigo        |
| IREF | Indice de Reforma Estrutural     |
| IMP  | Indice de Mercado e Producao     |
| ICD  | Indice de Custo de Decisao       |
| ICR  | Indice de Confianca Regulatoria  |
| IGE  | Indice Geopolitico-Estrategico   |
| ICN  | Indice de Controle Narrativo     |
| IAN  | Indice de Avanco Nacao           |
| IPR  | Indice de Projecao Internacional |

## Deliverables

### 1. Migration: `supabase/migrations/003_borin_index_tags.sql`
- ADD COLUMN `borin_index_tags text[] DEFAULT '{}'` to `processed_news`
- CREATE GIN INDEX for array containment queries

### 2. Edge Function: new action `tag_borin_indices` in `gemini-proxy/index.ts`

#### Where to insert (line reference)

Insert the new action block BEFORE the `health` action (currently line 329). This keeps logical grouping: data actions first, health last.

#### Exact code to add (old_string / new_string)

**old_string:**
```typescript
          if (action === "health") {
```

**new_string:**
```typescript
          if (action === "tag_borin_indices") {
                    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
                    const ids: string[] = body.article_ids ?? (body.article_id ? [body.article_id] : []);
                    if (!ids.length) return json({ error: "article_id or article_ids required" }, 400);
                    const TAG_MAP: Record<string, string[]> = {
                          'Economia & Finanças': ['IIR','IREF','IMP','ICD'],
                          'Agronegócio & Commodities': ['IIR','IAN'],
                          'Política & STF': ['IREF','ICR','IGE','ICN','ICD'],
                          'Negócios & Empreendedorismo': ['ICR','IAN','IMP'],
                          'Tecnologia & IA': ['IAN','IMP'],
                          'Segurança': ['IGE','ICN','ICD'],
                          'Infraestrutura & Imobiliário': ['IGE','IREF'],
                          'Liberdade & Censura': ['ICN','IGE'],
                          'Saúde & Ciência': ['IREF','IAN'],
                          'Energia': ['IIR','IGE'],
                          'Meio Ambiente': ['IGE','IAN'],
                          'Geopolítica & Guerra': ['IPR','IGE'],
                          'Mercado Financeiro & Forex': ['IIR','IMP','ICD'],
                          'Internacional': ['IPR'],
                          'Outros': [],
                          'Entretenimento & Cultura': [],
                          'Esportes': [],
                    };
                    const { data: articles, error: fetchErr } = await supabase
                          .from('processed_news').select('id,category').in('id', ids);
                    if (fetchErr) throw new Error(fetchErr.message);
                    if (!articles?.length) return json({ error: "No articles found", tagged: 0 }, 404);
                    const results = [];
                    for (const art of articles) {
                          const tags = TAG_MAP[art.category] ?? [];
                          await supabase.from('processed_news')
                                .update({ borin_index_tags: tags }).eq('id', art.id);
                          results.push({ article_id: art.id, tags });
                    }
                    return json({ tagged: results.length, results });
          }

          if (action === "health") {
```

This adds ~30 lines to the file (360 + 30 = 390, well under 500).

### 3. Integration into process_queue

After the successful INSERT into processed_news (line 161-163), tag the new article. We need the inserted article's ID.

**old_string:**
```typescript
              if (insertErr) throw new Error(`Insert: ${insertErr.message}`);

              await supabase.from("raw_news").update({ status: "done" }).eq("id", item.id);
```

**new_string:**
```typescript
              if (insertErr) throw new Error(`Insert: ${insertErr.message}`);

              // W34: tag borin indices for newly processed article
              const TAG_MAP_INLINE: Record<string, string[]> = {
                    'Economia & Finanças': ['IIR','IREF','IMP','ICD'],
                    'Agronegócio & Commodities': ['IIR','IAN'],
                    'Política & STF': ['IREF','ICR','IGE','ICN','ICD'],
                    'Negócios & Empreendedorismo': ['ICR','IAN','IMP'],
                    'Tecnologia & IA': ['IAN','IMP'],
                    'Segurança': ['IGE','ICN','ICD'],
                    'Infraestrutura & Imobiliário': ['IGE','IREF'],
                    'Liberdade & Censura': ['ICN','IGE'],
                    'Saúde & Ciência': ['IREF','IAN'],
                    'Energia': ['IIR','IGE'],
                    'Meio Ambiente': ['IGE','IAN'],
                    'Geopolítica & Guerra': ['IPR','IGE'],
                    'Mercado Financeiro & Forex': ['IIR','IMP','ICD'],
                    'Internacional': ['IPR'],
                    'Outros': [], 'Entretenimento & Cultura': [], 'Esportes': [],
              };
              const borinTags = TAG_MAP_INLINE[safe.category] ?? [];
              if (borinTags.length > 0) {
                    const { data: inserted } = await supabase.from('processed_news')
                          .select('id').eq('raw_id', item.id).limit(1).single();
                    if (inserted) {
                          await supabase.from('processed_news')
                                .update({ borin_index_tags: borinTags }).eq('id', inserted.id);
                    }
              }

              await supabase.from("raw_news").update({ status: "done" }).eq("id", item.id);
```

**WAIT -- REFACTOR**: The TAG_MAP is duplicated. Extract it as a top-level constant instead.

**BETTER APPROACH**: Add a single `TAG_MAP` constant at the top of the file (after line 18), then reference it in both `tag_borin_indices` action and `processQueue`.

**old_string (line 20-23):**
```typescript
const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

**new_string:**
```typescript
const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── W34: Borin Index Tags — deterministic category→indices mapping ──────────
const BORIN_TAG_MAP: Record<string, string[]> = {
        'Economia & Finanças': ['IIR','IREF','IMP','ICD'],
        'Agronegócio & Commodities': ['IIR','IAN'],
        'Política & STF': ['IREF','ICR','IGE','ICN','ICD'],
        'Negócios & Empreendedorismo': ['ICR','IAN','IMP'],
        'Tecnologia & IA': ['IAN','IMP'],
        'Segurança': ['IGE','ICN','ICD'],
        'Infraestrutura & Imobiliário': ['IGE','IREF'],
        'Liberdade & Censura': ['ICN','IGE'],
        'Saúde & Ciência': ['IREF','IAN'],
        'Energia': ['IIR','IGE'],
        'Meio Ambiente': ['IGE','IAN'],
        'Geopolítica & Guerra': ['IPR','IGE'],
        'Mercado Financeiro & Forex': ['IIR','IMP','ICD'],
        'Internacional': ['IPR'],
        'Outros': [],
        'Entretenimento & Cultura': [],
        'Esportes': [],
};
```

Then in both places, reference `BORIN_TAG_MAP` instead of inline maps.

### 4. Backfill: `supabase/migrations/004_backfill_borin_tags.sql`
- SQL function using CASE/WHEN to update all existing articles
- Idempotent: only touches rows where `borin_index_tags = '{}'`

### 5. Tests: `tests/e2e/w34-borin-tagger.spec.ts`
- 8 Playwright API-level tests (using `request` fixture, not browser)
- Tests call the Edge Function directly via HTTP POST
- RED phase: will fail until Executor implements

## Files Changed

| File | Action | Lines Added |
|------|--------|-------------|
| `supabase/migrations/003_borin_index_tags.sql` | CREATE | ~5 |
| `supabase/migrations/004_backfill_borin_tags.sql` | CREATE | ~35 |
| `supabase/functions/gemini-proxy/index.ts` | MODIFY | ~50 (map + action + process_queue hook) |
| `tests/e2e/w34-borin-tagger.spec.ts` | CREATE | ~150 |
| `docs/SPEC-W34.md` | CREATE (this file) | ~150 |

## Execution Order for Executor

1. Apply migration 003 (add column + index)
2. Add `BORIN_TAG_MAP` constant to index.ts (after corsHeaders)
3. Add `tag_borin_indices` action to index.ts (before health action)
4. Hook tagging into processQueue (after INSERT, before status=done)
5. Apply migration 004 (backfill existing articles)
6. Run tests: `npx playwright test tests/e2e/w34-borin-tagger.spec.ts`
7. Verify all 8 tests GREEN

## Constraints

- File stays under 500 lines (360 + ~50 = ~410)
- No LLM calls for tagging (pure deterministic mapping)
- Uses SUPABASE_SERVICE_ROLE_KEY for writes
- BORIN_TAG_MAP defined ONCE at top level (DRY)
