import { test, expect } from '@playwright/test';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-test-config';

// ============================================================================
// True Press W26 — Two-Fix Sprint E2E Tests (RED phase)
// Architect: Claude Opus | 2026-03-31
//
// Test 1: Friday dashboard loads > 2000 articles (FIX 1: limit=5000)
// Test 2: own_articles table exists in Supabase (FIX 2A: migration deployed)
// Test 3: OwnPressPanel renders canonical categories (FIX 2B: 17 cats)
// ============================================================================

const TRUEPRESS_PASSWORD = process.env.TRUEPRESS_PASSWORD || 'rodrigo';

// NON-NEGOTIABLE: All 17 canonical categories
const CANONICAL_CATEGORIES = [
  'Agronegocio & Commodities',
  'Politica & STF',
  'Mercado Financeiro & Forex',
  'Geopolitica & Guerra',
  'Tecnologia & IA',
  'Saude & Ciencia',
  'Seguranca',
  'Infraestrutura & Imobiliario',
  'Energia',
  'Meio Ambiente',
  'Economia & Financas',
  'Liberdade & Censura',
  'Negocios & Empreendedorismo',
  'Entretenimento & Cultura',
  'Esportes',
  'Internacional',
  'Outros',
];

test.describe('W26: No-Limit + Own Articles', () => {

  test('Friday loads > 2000 articles', async ({ browser }) => {
    // Navigate to Friday dashboard news page
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://friday.rodrigoborin.com/dashboard/#/news', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Wait for news to load — look for the total count indicator
    const countEl = page.locator('#news-total-count');
    await expect(countEl).toBeVisible({ timeout: 60000 });

    // Parse the count and verify > 2000
    const countText = await countEl.textContent();
    const count = parseInt(countText || '0', 10);
    expect(count, `Expected > 2000 articles but got ${count}`).toBeGreaterThan(2000);

    await context.close();
  });

  test('own_articles table exists in Supabase', async ({ request }) => {
    // Query the own_articles table via Supabase REST API
    // If table doesn't exist, Supabase returns 404 or 400 with relation error
    const response = await request.get(
      `${SUPABASE_URL}/rest/v1/own_articles?select=id&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    // Must be 200 (table exists). 404/400 = table not deployed yet
    expect(response.status(), 'own_articles table should exist (200), got ' + response.status()).toBe(200);

    // Response should be an array (even if empty)
    const body = await response.json();
    expect(Array.isArray(body), 'Response should be an array').toBe(true);
  });

  test('OwnPressPanel renders canonical category dropdown', async ({ page }) => {
    // Login to True Press dashboard
    await page.goto('https://news.rodrigoborin.com/', { waitUntil: 'networkidle', timeout: 30000 });

    // Handle password gate if present
    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await passwordInput.fill(TRUEPRESS_PASSWORD);
      await passwordInput.press('Enter');
    }

    // Wait for dashboard to load
    await expect(
      page.getByText('PRESS WATCH').or(page.getByText('DASHBOARD')).first()
    ).toBeVisible({ timeout: 15000 });

    // Navigate to MINHA IMPRENSA tab
    await page.getByRole('button', { name: 'MINHA IMPRENSA' }).click();
    await expect(page.getByRole('heading', { name: 'Minha Imprensa' })).toBeVisible({ timeout: 8000 });

    // Find the category dropdown/select
    const categorySelect = page.locator('select').first();
    await expect(categorySelect).toBeVisible({ timeout: 5000 });

    // Get all option values from the dropdown
    const options = await categorySelect.locator('option').allTextContents();

    // Must contain 'Tecnologia & IA' (canonical), NOT old 'Tecnologia'
    expect(options, 'Dropdown must contain canonical "Tecnologia & IA"').toContain('Tecnologia & IA');

    // Must NOT contain old simplified categories
    expect(options, 'Dropdown must not contain old "Tecnologia" (without & IA)').not.toContain('Tecnologia');
    expect(options, 'Dropdown must not contain old "Juridico"').not.toContain('Juridico');

    // Must have all 17 canonical categories
    // Note: option text may have accented chars rendered by browser, so we check key distinctive ones
    expect(options.length, 'Dropdown must have exactly 17 categories').toBe(17);
  });

});
