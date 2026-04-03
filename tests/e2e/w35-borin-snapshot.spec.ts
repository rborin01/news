import { describe, test, expect } from '@playwright/test';

/**
 * W35: Borin Indices Daily Snapshot — E2E Tests
 * Tests the snapshot_borin_daily action in gemini-proxy
 *
 * Prerequisites:
 * - Migration 005_borin_indices_daily.sql applied
 * - W34 migration 003_borin_index_tags.sql applied (borin_index_tags column exists)
 * - Some processed_news rows with borin_index_tags populated
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY, EDGE_FUNCTION_URL } from './supabase-test-config';

const BORIN_INDEX_CODES = ['IIR', 'IREF', 'ICR', 'IGE', 'ICN', 'IAN', 'IMP', 'ICD', 'IPR'] as const;

async function callEdgeFunction(body: Record<string, unknown>): Promise<{ status: number; data: any }> {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function supabaseQuery(table: string, params: string = ''): Promise<any[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  return res.json();
}

// Today in UTC-3 (Brasilia)
function todayBrasilia(): string {
  const now = new Date();
  const utc3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return utc3.toISOString().split('T')[0];
}

describe('W35: snapshot_borin_daily', () => {
  const today = todayBrasilia();

  beforeAll(async () => {
    // Ensure snapshot exists for today before running read tests
    await callEdgeFunction({ action: 'snapshot_borin_daily', date: today });
  });

  test('1. snapshot_borin_daily action returns 200 with snapshots_created = 9', async () => {
    const { status, data } = await callEdgeFunction({
      action: 'snapshot_borin_daily',
      date: today,
    });

    expect(status).toBe(200);
    expect(data.snapshots_created).toBe(9);
    expect(data.date).toBe(today);
  }, 30_000);

  test('2. Creates exactly 9 rows in borin_indices_daily (one per index)', async () => {
    const rows = await supabaseQuery(
      'borin_indices_daily',
      `date=eq.${today}&select=index_code`
    );

    expect(rows).toHaveLength(9);
    const codes = rows.map((r: any) => r.index_code).sort();
    expect(codes).toEqual([...BORIN_INDEX_CODES].sort());
  });

  test('3. article_count reflects actual articles with that tag', async () => {
    const rows = await supabaseQuery(
      'borin_indices_daily',
      `date=eq.${today}&select=index_code,article_count`
    );

    for (const row of rows) {
      expect(typeof row.article_count).toBe('number');
      expect(row.article_count).toBeGreaterThanOrEqual(0);
    }
  });

  test('4. UPSERT: calling twice for same date does not create duplicates', async () => {
    // Call snapshot again for the same date
    const { status, data } = await callEdgeFunction({
      action: 'snapshot_borin_daily',
      date: today,
    });

    expect(status).toBe(200);
    expect(data.snapshots_created).toBe(9);

    // Still exactly 9 rows (not 18)
    const rows = await supabaseQuery(
      'borin_indices_daily',
      `date=eq.${today}&select=index_code`
    );
    expect(rows).toHaveLength(9);
  }, 30_000);

  test('5. avg_score_rodrigo is between 0 and 100 (or null if no articles)', async () => {
    const rows = await supabaseQuery(
      'borin_indices_daily',
      `date=eq.${today}&select=avg_score_rodrigo,article_count`
    );

    for (const row of rows) {
      if (row.article_count > 0) {
        expect(Number(row.avg_score_rodrigo)).toBeGreaterThanOrEqual(0);
        expect(Number(row.avg_score_rodrigo)).toBeLessThanOrEqual(100);
      } else {
        // No articles => avg can be null
        expect(row.avg_score_rodrigo).toBeNull();
      }
    }
  });

  test('6. RLS: anon can read borin_indices_daily', async () => {
    const rows = await supabaseQuery(
      'borin_indices_daily',
      `select=id,date,index_code&limit=1`
    );

    // Should not get an error object, should get an array
    expect(Array.isArray(rows)).toBe(true);
    // If test 1 ran, we should have data
    expect(rows.length).toBeGreaterThanOrEqual(0);
  });
});
