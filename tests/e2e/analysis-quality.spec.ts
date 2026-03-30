import { test, expect } from '@playwright/test';

// ============================================================================
// True Press V4.1 — Analysis Quality E2E Tests (RED phase)
// Architect: Claude Opus | 2026-03-29
// These tests validate that processed_news records have deep analysis fields
// and that the Friday dashboard displays all 17 canonical categories.
// ============================================================================

const SUPABASE_URL = 'https://sfnvctljxidzueoutnxv.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbnZjdGxqeGlkenVlb3V0bnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTI5OTcsImV4cCI6MjA4NzY4ODk5N30.Yg65dHXyZqzBWNHM1nW-YfBx7FWFpWyoFvM_Obj-wQI';

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/gemini-proxy`;

// NON-NEGOTIABLE: These 17 categories are the ONLY valid values.
// This constant must match the Edge Function prompt AND Friday dashboard.
const CANONICAL_CATEGORIES = [
  'Agroneg\u00F3cio & Commodities',
  'Pol\u00EDtica & STF',
  'Mercado Financeiro & Forex',
  'Geopol\u00EDtica & Guerra',
  'Tecnologia & IA',
  'Sa\u00FAde & Ci\u00EAncia',
  'Seguran\u00E7a',
  'Infraestrutura & Imobili\u00E1rio',
  'Energia',
  'Meio Ambiente',
  'Economia & Finan\u00E7as',
  'Liberdade & Censura',
  'Neg\u00F3cios & Empreendedorismo',
  'Entretenimento & Cultura',
  'Esportes',
  'Internacional',
  'Outros',
];

// Minimum character counts for deep analysis fields
const MIN_NARRATIVE_MEDIA = 100;
const MIN_HIDDEN_INTENT = 100;
const MIN_IMPACT_RODRIGO = 200;
const MIN_SUMMARY = 150;
const PASS_THRESHOLD = 0.8; // 8 of 10 articles must pass

interface ProcessedArticle {
  id: number;
  summary: string;
  narrative_media: string;
  hidden_intent: string;
  impact_rodrigo: string;
  category: string;
}

async function fetchRecentArticles(count = 10): Promise<ProcessedArticle[]> {
  const url = `${SUPABASE_URL}/rest/v1/processed_news?select=id,summary,narrative_media,hidden_intent,impact_rodrigo,category&order=processed_at.desc&limit=${count}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status}`);
  return res.json();
}

// ── Data Quality Tests (direct Supabase API, no browser) ──────────────────

test.describe('V4.1 Analysis Quality — Data', () => {
  let articles: ProcessedArticle[];

  test.beforeAll(async () => {
    articles = await fetchRecentArticles(10);
    expect(articles.length).toBeGreaterThan(0);
  });

  test('narrative_media field > 100 chars in 80%+ of articles', async () => {
    const passing = articles.filter(
      (a) => (a.narrative_media || '').length > MIN_NARRATIVE_MEDIA
    );
    const ratio = passing.length / articles.length;
    expect(ratio).toBeGreaterThanOrEqual(PASS_THRESHOLD);
  });

  test('hidden_intent field > 100 chars in 80%+ of articles', async () => {
    const passing = articles.filter(
      (a) => (a.hidden_intent || '').length > MIN_HIDDEN_INTENT
    );
    const ratio = passing.length / articles.length;
    expect(ratio).toBeGreaterThanOrEqual(PASS_THRESHOLD);
  });

  test('impact_rodrigo field > 200 chars in 80%+ of articles', async () => {
    const passing = articles.filter(
      (a) => (a.impact_rodrigo || '').length > MIN_IMPACT_RODRIGO
    );
    const ratio = passing.length / articles.length;
    expect(ratio).toBeGreaterThanOrEqual(PASS_THRESHOLD);
  });

  test('summary field > 150 chars in 80%+ of articles', async () => {
    const passing = articles.filter(
      (a) => (a.summary || '').length > MIN_SUMMARY
    );
    const ratio = passing.length / articles.length;
    expect(ratio).toBeGreaterThanOrEqual(PASS_THRESHOLD);
  });
});

// ── Article Count Test ────────────────────────────────────────────────────

test.describe('V4.1 Analysis Quality — Volume', () => {
  test('processed_news has >= 400 articles total', async () => {
    const url = `${SUPABASE_URL}/rest/v1/processed_news?select=id&limit=1`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'count=exact',
      },
    });
    expect(res.ok).toBe(true);
    const countHeader = res.headers.get('content-range');
    // content-range format: "0-0/N" or "*/N"
    const total = countHeader
      ? parseInt(countHeader.split('/')[1], 10)
      : 0;
    expect(total).toBeGreaterThanOrEqual(400);
  });
});

// ── Edge Function Health Test ─────────────────────────────────────────────

test.describe('V4.1 Analysis Quality — Edge Function', () => {
  test('health endpoint returns groq_model = llama-3.3-70b-versatile', async () => {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ action: 'health' }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.groq_model).toBe('llama-3.3-70b-versatile');
  });
});

// ── Friday Dashboard Category Test ────────────────────────────────────────

test.describe('V4.1 Analysis Quality — Friday Dashboard', () => {
  test('sidebar contains all 17 canonical categories', async ({ page }) => {
    // Friday dashboard news page — no auth needed for category sidebar check
    const fridayUrl =
      process.env.FRIDAY_URL || 'https://friday.rodrigoborin.com';
    await page.goto(`${fridayUrl}/pages/news`, { waitUntil: 'networkidle' });

    // Wait for news page to load
    await page.waitForTimeout(3000);

    // Get all text content from the sidebar
    const pageText = await page.textContent('body');

    // Each canonical category must appear somewhere on the page
    // (they are rendered in the sidebar filter list)
    for (const cat of CANONICAL_CATEGORIES) {
      expect(
        pageText,
        `Category "${cat}" not found on Friday dashboard`
      ).toContain(cat);
    }
  });
});
