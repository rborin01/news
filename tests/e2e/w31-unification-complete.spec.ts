/**
 * W31 — Complete "One Page" Unification
 * 3 features: Score Filter Slider, Queue Stats in Sidebar, Auto Resumo Executivo
 *
 * RED phase — written before implementation.
 */

import { test, expect } from '@playwright/test';

const PASSWORD = process.env.TRUEPRESS_PASSWORD || 'rodrigo';

async function authenticate(page: any) {
  await page.goto('/');
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ timeout: 5000 });
  await passwordInput.fill(PASSWORD);
  await passwordInput.press('Enter');
  await page.locator('aside').first().waitFor({ timeout: 15000 });
}

// ==================== F1: Score Filter Slider in Sidebar ====================

test.describe('W31 — Score Filter Slider in Sidebar', () => {

  test('score slider exists in sidebar with correct data-testid', async ({ page }) => {
    await authenticate(page);
    const slider = page.locator('[data-testid="score-filter-slider"]');
    await expect(slider).toBeVisible({ timeout: 5000 });
    await expect(slider).toHaveAttribute('type', 'range');
    await expect(slider).toHaveAttribute('min', '0');
    await expect(slider).toHaveAttribute('max', '100');
  });

  test('score slider shows article count label', async ({ page }) => {
    await authenticate(page);
    const countLabel = page.locator('[data-testid="score-filter-count"]');
    await expect(countLabel).toBeVisible({ timeout: 5000 });
    const text = await countLabel.textContent();
    expect(text).toMatch(/artigos/i);
  });
});

// ==================== F2: Queue Stats in Sidebar ====================

test.describe('W31 — Queue Stats in Sidebar', () => {

  test('queue stats visible in sidebar with pending/processing/done labels', async ({ page }) => {
    await authenticate(page);
    const statsContainer = page.locator('[data-testid="queue-stats-sidebar"]');
    await expect(statsContainer).toBeVisible({ timeout: 10000 });
    await expect(statsContainer.locator('text=Pendente')).toBeVisible();
    await expect(statsContainer.locator('text=Processando')).toBeVisible();
    await expect(statsContainer.locator('text=Conclu')).toBeVisible();
  });
});

// ==================== F3: Auto Resumo Executivo ====================

test.describe('W31 — Auto Resumo Executivo on Load', () => {

  test('resumo executivo auto-generates on page load without user clicking', async ({ page }) => {
    test.setTimeout(60000);
    // Clear localStorage so the app starts with placeholder (no saved state)
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    // Re-authenticate from clean state
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.waitFor({ timeout: 5000 });
    await passwordInput.fill(PASSWORD);
    await passwordInput.press('Enter');
    await page.locator('aside').first().waitFor({ timeout: 15000 });
    const summaryText = page.locator('.text-slate-300.leading-relaxed');
    await expect(summaryText).toBeVisible({ timeout: 10000 });
    // Wait for auto-trigger to replace both possible placeholder values (Estado restaurado. / Sistema pronto...)
    await expect(summaryText).not.toHaveText(/Sistema pronto|Estado restaurado/, { timeout: 50000 });
    const text = await summaryText.textContent();
    // A real summary from Claude should be at least 50 characters
    expect(text!.length).toBeGreaterThan(50);
  });
});
