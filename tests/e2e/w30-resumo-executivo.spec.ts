/**
 * W30 — Resumo Executivo uses Claude (not browser-side Gemini)
 * + Password fallback fix for intelligence/own-press tests
 *
 * RED phase — written before implementation.
 */

import { test, expect } from '@playwright/test';
import { SUPABASE_URL, SUPABASE_ANON_KEY, EDGE_FUNCTION_URL } from './supabase-test-config';

// Set TRUEPRESS_PASSWORD env var before running UI auth tests
const PASSWORD = process.env.TRUEPRESS_PASSWORD || '';

// ==================== Fix 1: Resumo Executivo via Edge Function ====================

test.describe('W30 — Resumo Executivo via Claude Edge Function', () => {

  test('generate action returns non-empty text', async ({ request }) => {
    const testPrompt = 'Resuma em uma frase: O mercado financeiro brasileiro fechou em alta.';

    const res = await request.post(EDGE_FUNCTION_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      data: { action: 'generate', prompt: testPrompt },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body).toHaveProperty('text');
    expect(typeof body.text).toBe('string');
    expect(body.text.length).toBeGreaterThan(10);
    expect(body.text).not.toBe('Resumo indisponível.');
  });

  test('generate action handles strategic summary prompt', async ({ request }) => {
    const topNews = [
      '- Dólar cai 2% com entrada de capital estrangeiro: Positivo para importadores',
      '- STF julga marco fiscal: Incerteza regulatória no curto prazo',
      '- Safra recorde de soja: Agronegócio em alta, pressão sobre preços',
    ].join('\n');

    const prompt = `Atue como Conselheiro Estratégico. Resuma executivamente para Rodrigo Borin:\n${topNews}`;

    const res = await request.post(EDGE_FUNCTION_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      data: { action: 'generate', prompt },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body).toHaveProperty('text');
    expect(body.text.length).toBeGreaterThan(30);
    expect(body.text).not.toBe('Resumo indisponível.');
    expect(body.text).not.toBe('');
  });

  test('generateDailySummary source code uses generateWithGemini not ai.models', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const url = await import('url');

    const __filename = url.fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const servicePath = path.resolve(__dirname, '../../services/geminiService.ts');
    const source = fs.readFileSync(servicePath, 'utf-8');

    const fnMatch = source.match(/export const generateDailySummary[\s\S]*?^};/m);
    expect(fnMatch).not.toBeNull();

    const fnBody = fnMatch![0];

    expect(fnBody).toContain('generateWithGemini');
    expect(fnBody).not.toContain('ai.models.generateContent');
    expect(fnBody).not.toContain('"Resumo indisponível."');
  });
});

// ==================== Fix 2: Password fallback in existing tests ====================

test.describe('W30 — Test authentication with correct password', () => {

  test('intelligence tests can authenticate with password rodrigo', async ({ page }) => {
    await page.goto('/');
    const passwordInput = page.locator('input[type="password"]');

    if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await passwordInput.fill(PASSWORD);
      await passwordInput.press('Enter');
    }

    await expect(
      page.getByText('PRESS WATCH').or(page.getByText('DASHBOARD')).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('own-press page is accessible after auth', async ({ page }) => {
    await page.goto('/');
    const passwordInput = page.locator('input[type="password"]');

    if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await passwordInput.fill(PASSWORD);
      await passwordInput.press('Enter');
    }

    await expect(
      page.getByText('PRESS WATCH').or(page.getByText('DASHBOARD')).first()
    ).toBeVisible({ timeout: 15000 });

    await page.getByText('MINHA IMPRENSA').first().click();
    await expect(page.getByText('Minha Imprensa').first()).toBeVisible({ timeout: 8000 });
  });
});
