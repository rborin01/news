# SPEC-W35: Borin Indices Daily Snapshot

> Author: FORGE Architect (Opus)
> Date: 2026-04-03
> Status: RED (tests written, implementation pending)

## Overview

Daily consolidation of Borin Index metrics from `processed_news.borin_index_tags` into a `borin_indices_daily` summary table. Enables dashboard charts showing index trends over time.

## Dependencies

- **W34**: `processed_news.borin_index_tags text[]` column must exist (migration `003_borin_index_tags.sql`)

## Deliverables

### 1. Migration: `supabase/migrations/005_borin_indices_daily.sql`
- DONE (written by Architect)
- Creates `borin_indices_daily` table with RLS and indexes

### 2. Edge Function Action: `snapshot_borin_daily`

**Location**: `supabase/functions/gemini-proxy/index.ts`

**Insert the new action block BEFORE the `health` action block** (line 329 in current file).

The exact code to insert:

```typescript
          if (action === "snapshot_borin_daily") {
                      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
                      const INDEX_CODES = ['IIR','IREF','ICR','IGE','ICN','IAN','IMP','ICD','IPR'];

                      // Default to today in UTC-3 (Brasilia)
                      let targetDate = body.date;
                      if (!targetDate) {
                            const now = new Date();
                            const utc3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);
                            targetDate = utc3.toISOString().split('T')[0];
                      }

                      let snapshotsCreated = 0;

                      for (const code of INDEX_CODES) {
                            // Count articles + averages for this index on target date
                            const { data: articles } = await supabase
                                  .from('processed_news')
                                  .select('id, score_rodrigo, score_brasil')
                                  .contains('borin_index_tags', [code])
                                  .gte('processed_at', `${targetDate}T00:00:00`)
                                  .lt('processed_at', `${targetDate}T23:59:59.999`);

                            const count = articles?.length ?? 0;
                            let avgRodrigo: number | null = null;
                            let avgBrasil: number | null = null;
                            let topArticles: string[] = [];
                            let sentiment: string = 'neutral';

                            if (count > 0) {
                                  const scores = articles!;
                                  avgRodrigo = Math.round(
                                        (scores.reduce((s: number, a: any) => s + (Number(a.score_rodrigo) || 0), 0) / count) * 100
                                  ) / 100;
                                  avgBrasil = Math.round(
                                        (scores.reduce((s: number, a: any) => s + (Number(a.score_brasil) || 0), 0) / count) * 100
                                  ) / 100;

                                  // Top 3 by score_rodrigo DESC
                                  topArticles = scores
                                        .sort((a: any, b: any) => (Number(b.score_rodrigo) || 0) - (Number(a.score_rodrigo) || 0))
                                        .slice(0, 3)
                                        .map((a: any) => a.id);

                                  // Sentiment classification
                                  if (avgRodrigo >= 65) sentiment = 'positive';
                                  else if (avgRodrigo <= 35) sentiment = 'negative';
                                  else sentiment = 'neutral';
                            }

                            const { error: upsertErr } = await supabase
                                  .from('borin_indices_daily')
                                  .upsert({
                                        date: targetDate,
                                        index_code: code,
                                        article_count: count,
                                        avg_score_rodrigo: avgRodrigo,
                                        avg_score_brasil: avgBrasil,
                                        top_articles: topArticles,
                                        sentiment_label: count > 0 ? sentiment : 'neutral',
                                        snapshot_at: new Date().toISOString(),
                                  }, { onConflict: 'date,index_code' });

                            if (upsertErr) throw new Error(`Upsert ${code}: ${upsertErr.message}`);
                            snapshotsCreated++;
                      }

                      return json({ snapshots_created: snapshotsCreated, date: targetDate });
          }
```

**Exact edit instruction for Executor**:

In `supabase/functions/gemini-proxy/index.ts`, find this exact string:

```
          if (action === "health") {
```

Insert the entire `snapshot_borin_daily` block (above) BEFORE that line.

This adds ~60 lines. File goes from 361 to ~421 lines (under 500 limit).

### 3. Cron Job SQL (manual in Supabase SQL Editor)

```sql
SELECT cron.schedule(
  'borin-daily-snapshot',
  '50 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfnvctljxidzueoutnxv.supabase.co/functions/v1/gemini-proxy',
    body := '{"action":"snapshot_borin_daily"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SERVICE_ROLE_KEY_PLACEHOLDER'
    )
  );
  $$
);
```

**NOTE**: Replace `SERVICE_ROLE_KEY_PLACEHOLDER` with the actual SUPABASE_SERVICE_ROLE_KEY from Supabase Dashboard > Settings > API > service_role key.

**NOTE**: Supabase uses `net.http_post` (pg_net extension), NOT `supabase_functions.http_post`. The pg_net extension is enabled by default on Supabase projects.

### 4. Tests: `tests/e2e/w35-borin-snapshot.spec.ts`
- DONE (written by Architect)
- 6 tests covering: action return, row count, article_count, upsert idempotency, score range, RLS

## Execution Steps for Executor

1. **Apply migration**: Run `005_borin_indices_daily.sql` in Supabase SQL Editor (or `supabase db push`)
2. **Edit gemini-proxy/index.ts**: Insert the `snapshot_borin_daily` action block before the `health` action block
3. **Deploy edge function**: `supabase functions deploy gemini-proxy --project-ref sfnvctljxidzueoutnxv`
4. **Run tests**: `npx jest tests/e2e/w35-borin-snapshot.spec.ts` — all 6 must pass GREEN
5. **Schedule cron**: Run the cron SQL in Supabase SQL Editor (replace SERVICE_ROLE_KEY_PLACEHOLDER)

## Constraints Verified

- [x] New code in index.ts: ~60 lines (under 100-line limit)
- [x] Total index.ts after edit: ~421 lines (under 500-line limit)
- [x] Uses SUPABASE_SERVICE_ROLE_KEY for writes (not anon)
- [x] All files under 500 lines
- [x] Supabase `.contains()` used for `@>` array operator on `borin_index_tags`
- [x] UPSERT with `onConflict: 'date,index_code'` prevents duplicates

## Success Criteria

- [ ] Migration applied, `borin_indices_daily` table exists in Supabase
- [ ] `snapshot_borin_daily` action returns `{ snapshots_created: 9, date: "YYYY-MM-DD" }`
- [ ] 9 rows created per date (one per Borin Index code)
- [ ] Calling twice for same date = still 9 rows (not 18)
- [ ] `avg_score_rodrigo` in [0, 100] when articles exist, null when 0 articles
- [ ] Anon user can SELECT from `borin_indices_daily` (RLS policy)
- [ ] Cron job scheduled at 23:50 UTC daily
- [ ] All 6 E2E tests GREEN
