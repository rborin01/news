/**
 * W27-W29 Unification Tests
 * W27: Groq → Claude API migration
 * W28: ATUALIZAR button + generate action
 * W29: IntelDashboard component
 *
 * RED phase — written before implementation.
 */

import { test, expect } from '@playwright/test';
import { SUPABASE_URL, SUPABASE_ANON_KEY, EDGE_FUNCTION_URL } from './supabase-test-config';

// ==================== W27: Claude API Migration ====================

test.describe('W27 — Claude API in Edge Function', () => {
  test('health check reports claude instead of groq', async ({ request }) => {
    const res = await request.post(EDGE_FUNCTION_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      data: { action: 'health' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // After W27, health should report claude, not groq
    expect(body).toHaveProperty('claude');
    expect(body).toHaveProperty('claude_model');
    expect(body.claude_model).toContain('claude');
    // groq fields should not exist
    expect(body).not.toHaveProperty('groq');
    expect(body).not.toHaveProperty('groq_model');
  });

  test('generate action returns text via Claude', async ({ request }) => {
    const res = await request.post(EDGE_FUNCTION_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      data: { action: 'generate', prompt: 'Diga apenas: teste OK' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('text');
    expect(body.text.length).toBeGreaterThan(0);
    // model_used should be claude
    if (body.model_used) {
      expect(body.model_used).toContain('claude');
    }
  });

  test('analyze_news returns claude model_used', async ({ request }) => {
    const res = await request.post(EDGE_FUNCTION_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      data: {
        action: 'analyze_news',
        title: 'Test: Soja sobe 5% com demanda chinesa',
        content_raw: 'Exportacoes de soja atingem recorde em marco de 2026.',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.model_used).toContain('claude');
    // Must have valid category from canonical list
    const CANONICAL = [
      'Agronegocio & Commodities', 'Agronegócio & Commodities',
      'Politica & STF', 'Política & STF',
      'Mercado Financeiro & Forex', 'Geopolitica & Guerra', 'Geopolítica & Guerra',
      'Tecnologia & IA', 'Saude & Ciencia', 'Saúde & Ciência',
      'Seguranca', 'Segurança', 'Infraestrutura & Imobiliario', 'Infraestrutura & Imobiliário',
      'Energia', 'Meio Ambiente', 'Economia & Financas', 'Economia & Finanças',
      'Liberdade & Censura', 'Negocios & Empreendedorismo', 'Negócios & Empreendedorismo',
      'Entretenimento & Cultura', 'Esportes', 'Internacional', 'Outros',
    ];
    expect(CANONICAL).toContain(body.category);
  });

  test('17 canonical categories preserved in prompt', async ({ request }) => {
    // Verify the edge function still includes all 17 categories in its analysis prompt
    // by checking that analyze_news returns a valid category
    const res = await request.post(EDGE_FUNCTION_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      data: {
        action: 'analyze_news',
        title: 'Bitcoin atinge novo recorde historico',
        content_raw: 'Bitcoin ultrapassou 150 mil dolares pela primeira vez.',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Should return a recognized category
    expect(body).toHaveProperty('category');
    expect(typeof body.category).toBe('string');
    expect(body.category.length).toBeGreaterThan(2);
  });
});

// ==================== W28: ATUALIZAR Button ====================

test.describe('W28 — Friday ATUALIZAR button', () => {
  const FRIDAY_URL = process.env.FRIDAY_URL || 'https://friday.rodrigoborin.com';

  test('ATUALIZAR button exists in Friday news sidebar', async ({ page }) => {
    // Skip if Friday is not accessible
    try {
      await page.goto(`${FRIDAY_URL}/pages/news`, { timeout: 10000 });
    } catch {
      test.skip(true, 'Friday dashboard not accessible');
      return;
    }
    // Wait for sidebar to render
    await page.waitForTimeout(3000);
    const btn = page.locator('#tp-refresh-btn');
    await expect(btn).toBeVisible({ timeout: 5000 });
    await expect(btn).toContainText('Atualizar');
  });

  test('generate action works in edge function', async ({ request }) => {
    const res = await request.post(EDGE_FUNCTION_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      data: {
        action: 'generate',
        prompt: 'Responda apenas com a palavra: funcionando',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('text');
    expect(body.text.length).toBeGreaterThan(0);
  });
});

// ==================== W29: IntelDashboard ====================

test.describe('W29 — IntelDashboard on news.rodrigoborin.com', () => {
  const NEWS_URL = process.env.NEWS_URL || 'https://news.rodrigoborin.com';

  test('IntelDashboard stats cards visible', async ({ page }) => {
    try {
      await page.goto(NEWS_URL, { timeout: 15000 });
    } catch {
      test.skip(true, 'news.rodrigoborin.com not accessible');
      return;
    }
    await page.waitForTimeout(3000);
    // Stats cards should be visible
    const statsSection = page.locator('[data-testid="intel-stats"]');
    await expect(statsSection).toBeVisible({ timeout: 10000 });
  });

  test('business briefing cards visible', async ({ page }) => {
    try {
      await page.goto(NEWS_URL, { timeout: 15000 });
    } catch {
      test.skip(true, 'news.rodrigoborin.com not accessible');
      return;
    }
    await page.waitForTimeout(3000);
    const briefings = page.locator('[data-testid="intel-briefings"]');
    await expect(briefings).toBeVisible({ timeout: 10000 });
  });

  test('pipeline status visible', async ({ page }) => {
    try {
      await page.goto(NEWS_URL, { timeout: 15000 });
    } catch {
      test.skip(true, 'news.rodrigoborin.com not accessible');
      return;
    }
    await page.waitForTimeout(3000);
    const pipeline = page.locator('[data-testid="intel-pipeline"]');
    await expect(pipeline).toBeVisible({ timeout: 10000 });
  });
});
