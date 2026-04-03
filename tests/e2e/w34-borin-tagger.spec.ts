/**
 * W34 -- Borin Index Tagger
 * RED phase -- tests written before implementation.
 *
 * Tests the tag_borin_indices action in gemini-proxy Edge Function.
 * All tests use Playwright's API request context (no browser needed).
 */

import { test, expect } from '@playwright/test';
import { SUPABASE_URL, SUPABASE_ANON_KEY, EDGE_FUNCTION_URL } from './supabase-test-config';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

// Helper: call edge function
async function callEdge(request: any, data: Record<string, any>) {
  return request.post(EDGE_FUNCTION_URL, { headers, data });
}

// Helper: query processed_news via REST API
async function queryProcessedNews(request: any, params: string) {
  const url = `${SUPABASE_URL}/rest/v1/processed_news?${params}`;
  return request.get(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
}

test.describe('W34 -- Borin Index Tagger', () => {

  test('tag_borin_indices action exists and rejects empty input', async ({ request }) => {
    const res = await callEdge(request, { action: 'tag_borin_indices' });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('article_id');
  });

  test('Economia & Financas maps to [IIR, IREF, IMP, ICD]', async ({ request }) => {
    // Get any article with category 'Economia & Finanças'
    const listRes = await queryProcessedNews(request,
      'category=eq.Economia%20%26%20Finan%C3%A7as&limit=1&select=id,category');
    const articles = await listRes.json();
    test.skip(!articles?.length, 'No Economia articles in DB');

    const res = await callEdge(request, {
      action: 'tag_borin_indices',
      article_id: articles[0].id,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.tagged).toBe(1);
    expect(body.results[0].tags).toEqual(['IIR', 'IREF', 'IMP', 'ICD']);
  });

  test('Politica & STF maps include IGE', async ({ request }) => {
    const listRes = await queryProcessedNews(request,
      'category=eq.Pol%C3%ADtica%20%26%20STF&limit=1&select=id,category');
    const articles = await listRes.json();
    test.skip(!articles?.length, 'No Politica articles in DB');

    const res = await callEdge(request, {
      action: 'tag_borin_indices',
      article_id: articles[0].id,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.results[0].tags).toContain('IGE');
    expect(body.results[0].tags).toEqual(['IREF', 'ICR', 'IGE', 'ICN', 'ICD']);
  });

  test('Outros maps to empty array', async ({ request }) => {
    const listRes = await queryProcessedNews(request,
      'category=eq.Outros&limit=1&select=id,category');
    const articles = await listRes.json();
    test.skip(!articles?.length, 'No Outros articles in DB');

    const res = await callEdge(request, {
      action: 'tag_borin_indices',
      article_id: articles[0].id,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.results[0].tags).toEqual([]);
  });

  test('Esportes maps to empty array', async ({ request }) => {
    const listRes = await queryProcessedNews(request,
      'category=eq.Esportes&limit=1&select=id,category');
    const articles = await listRes.json();
    test.skip(!articles?.length, 'No Esportes articles in DB');

    const res = await callEdge(request, {
      action: 'tag_borin_indices',
      article_id: articles[0].id,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.results[0].tags).toEqual([]);
  });

  test('batch: tag_borin_indices accepts article_ids array', async ({ request }) => {
    // Get 2 articles of any category
    const listRes = await queryProcessedNews(request, 'limit=2&select=id');
    const articles = await listRes.json();
    test.skip(!articles?.length || articles.length < 2, 'Need at least 2 articles');

    const res = await callEdge(request, {
      action: 'tag_borin_indices',
      article_ids: articles.map((a: any) => a.id),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.tagged).toBe(2);
    expect(body.results).toHaveLength(2);
    // Each result should have article_id and tags
    for (const r of body.results) {
      expect(r).toHaveProperty('article_id');
      expect(r).toHaveProperty('tags');
      expect(Array.isArray(r.tags)).toBe(true);
    }
  });

  test('tagged article persists borin_index_tags in DB', async ({ request }) => {
    // Get an article with a known category that produces tags
    const listRes = await queryProcessedNews(request,
      'category=eq.Energia&limit=1&select=id');
    const articles = await listRes.json();
    test.skip(!articles?.length, 'No Energia articles in DB');

    // Tag it
    await callEdge(request, {
      action: 'tag_borin_indices',
      article_id: articles[0].id,
    });

    // Verify via REST API that borin_index_tags is set
    const verifyRes = await queryProcessedNews(request,
      `id=eq.${articles[0].id}&select=id,borin_index_tags`);
    const verified = await verifyRes.json();
    expect(verified).toHaveLength(1);
    expect(verified[0].borin_index_tags).toEqual(['IIR', 'IGE']);
  });

  test('filter: containment query cs.{IIR} returns tagged articles', async ({ request }) => {
    // First ensure at least one article is tagged with IIR
    const listRes = await queryProcessedNews(request,
      'category=eq.Energia&limit=1&select=id');
    const articles = await listRes.json();
    test.skip(!articles?.length, 'No Energia articles in DB');

    // Tag it to ensure IIR is present
    await callEdge(request, {
      action: 'tag_borin_indices',
      article_id: articles[0].id,
    });

    // Query using array containment
    const filterRes = await queryProcessedNews(request,
      'borin_index_tags=cs.%7BIIR%7D&limit=5&select=id,borin_index_tags');
    expect(filterRes.ok()).toBeTruthy();
    const filtered = await filterRes.json();
    expect(filtered.length).toBeGreaterThan(0);
    for (const art of filtered) {
      expect(art.borin_index_tags).toContain('IIR');
    }
  });

});
