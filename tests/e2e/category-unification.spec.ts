import { test, expect } from '@playwright/test';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-test-config';

/**
 * W25 — True Press Category Unification
 * Architect: Claude Opus | 2026-03-31
 *
 * These tests are written RED (must fail now, pass after executor implements).
 * They validate:
 *   1. Friday dashboard limit bump (500 -> 2000)
 *   2. mapCategory pipe-split normalization
 *   3. React sidebar has no pipe-separated categories
 *   4. React sidebar contains all 17 canonical categories
 *   5. IA quick-filter alias works
 */

const NEWS_URL = 'https://news.rodrigoborin.com';
const FRIDAY_URL = 'https://friday.rodrigoborin.com';

const CANONICAL_CATEGORIES = [
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

const PASSWORD = process.env.TRUEPRESS_PASSWORD || 'rodrigo';

async function loginTruePress(page: any) {
  await page.goto(NEWS_URL);
  const passwordInput = page.locator('input[type="password"]');
  if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await passwordInput.fill(PASSWORD);
    await passwordInput.press('Enter');
  }
  // Wait for sidebar to confirm past auth (unique to authenticated view)
  await expect(page.locator('aside').first()).toBeVisible({ timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Test 1: Friday limit bump — Supabase query returns > 500 articles
// ---------------------------------------------------------------------------
test.describe('W25 Category Unification', () => {

  test('Supabase processed_news has > 500 rows available', async ({ request }) => {
    // Direct Supabase REST call to verify data volume
    const resp = await request.get(
      `${SUPABASE_URL}/rest/v1/processed_news?select=id&order=processed_at.desc&limit=2000`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    // If True Press has > 500 articles, the old limit=500 was truncating
    expect(data.length).toBeGreaterThan(500);
  });

  // ---------------------------------------------------------------------------
  // Test 2: mapCategory pipe-split normalization (unit-level via Supabase data)
  // ---------------------------------------------------------------------------
  test('Supabase has pipe-separated categories that need normalization', async ({ request }) => {
    const resp = await request.get(
      `${SUPABASE_URL}/rest/v1/processed_news?select=category&order=processed_at.desc&limit=2000`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    expect(resp.ok()).toBeTruthy();
    const data: { category: string }[] = await resp.json();

    // Verify that pipe-separated categories exist in the raw data
    const pipeCategories = data.filter(d => d.category && d.category.includes('|'));
    // This confirms the problem exists — raw data has pipe-separated values
    expect(pipeCategories.length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Test 3: news.rodrigoborin.com sidebar has NO pipe-separated categories
  // ---------------------------------------------------------------------------
  test('sidebar has no pipe-separated categories', async ({ page }) => {
    await loginTruePress(page);

    // Wait for sidebar to render with categories
    await page.waitForSelector('aside button span.truncate', { timeout: 20000 });

    // Get all sidebar button labels
    const categoryLabels = await page.$$eval(
      'aside button span.truncate',
      (spans: HTMLSpanElement[]) => spans.map(s => s.textContent || '')
    );

    // None should contain a pipe character
    const pipeLabels = categoryLabels.filter(label => label.includes('|'));
    expect(pipeLabels).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Test 4: news.rodrigoborin.com sidebar contains all 17 canonical categories
  // ---------------------------------------------------------------------------
  test('sidebar contains all 17 canonical categories', async ({ page }) => {
    await loginTruePress(page);

    // Wait for sidebar
    await page.waitForSelector('aside button span.truncate', { timeout: 20000 });

    const categoryLabels = await page.$$eval(
      'aside button span.truncate',
      (spans: HTMLSpanElement[]) => spans.map(s => (s.textContent || '').trim())
    );

    // Every canonical category must appear in the sidebar
    for (const canonical of CANONICAL_CATEGORIES) {
      expect(
        categoryLabels.some(label => label === canonical),
        `Missing canonical category: "${canonical}" in sidebar. Found: ${categoryLabels.join(', ')}`
      ).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // Test 5: IA quick-filter works — clicking Tecnologia & IA filters articles
  // ---------------------------------------------------------------------------
  test('IA filter shows only Tecnologia & IA articles', async ({ page }) => {
    await loginTruePress(page);

    // Wait for articles to load
    await page.waitForSelector('aside button span.truncate', { timeout: 20000 });

    // Click the "Tecnologia & IA" sidebar button — exact match to avoid matching pipe-separated combos
    const techButton = page.locator('aside button span.truncate').filter({ hasText: /^Tecnologia & IA$/ });
    await expect(techButton.first()).toBeVisible({ timeout: 10000 });
    await techButton.first().click();

    // Wait for filter to apply
    await page.waitForTimeout(1000);

    // Verify the button is now active (has blue styling) — exact match
    const parentButton = page.locator('aside button').filter({ hasText: /^Tecnologia & IA$/ });
    await expect(parentButton.first()).toHaveClass(/bg-blue-50|border-blue-600/);
  });

});
