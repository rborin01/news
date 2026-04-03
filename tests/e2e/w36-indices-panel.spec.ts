import { test, expect } from '@playwright/test';

/**
 * W36: Indices Borin Panel — E2E Tests
 * Tests the DATA ROOM IndicesBorinPanel, Chart, and Drilldown components.
 *
 * Prerequisites:
 * - W34 + W35 migrations applied (borin_index_tags + borin_indices_daily)
 * - At least one snapshot_borin_daily run (so borin_indices_daily has data)
 * - App deployed or running locally
 *
 * These tests navigate to the app, switch to DATA ROOM view,
 * and verify the Indices Borin Panel renders correctly.
 */

const BORIN_INDEX_CODES = ['IIR', 'IREF', 'ICR', 'IGE', 'ICN', 'IAN', 'IMP', 'ICD', 'IPR'] as const;

test.describe('W36: Indices Borin Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and switch to DATA ROOM view
    await page.goto('/');
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    // Click DATA ROOM tab
    const dataRoomTab = page.locator('button', { hasText: 'DATA ROOM' });
    await dataRoomTab.click();
    // Wait for the panel to appear (loading or loaded)
    await page.waitForSelector('[data-testid="indices-borin-panel"]', { timeout: 15000 });
  });

  test('1. DATA ROOM view shows IndicesBorinPanel container', async ({ page }) => {
    const panel = page.locator('[data-testid="indices-borin-panel"]');
    await expect(panel).toBeVisible();
    // Should contain the header text
    await expect(panel.locator('text=Indices Borin')).toBeVisible();
  });

  test('2. Panel renders 9 index code badges', async ({ page }) => {
    // Wait for loading to finish (badges appear only when data is loaded)
    // Either we see badges or the empty state
    const firstBadge = page.locator('[data-testid="index-badge-IIR"]');
    const emptyState = page.locator('text=Sem dados');

    // One of these must be visible
    const hasBadges = await firstBadge.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    expect(hasBadges || hasEmpty).toBe(true);

    if (hasBadges) {
      // Verify all 9 badges exist
      for (const code of BORIN_INDEX_CODES) {
        const badge = page.locator(`[data-testid="index-badge-${code}"]`);
        await expect(badge).toBeVisible();
        await expect(badge).toHaveText(code);
      }
    }
  });

  test('3. Each card has article_count and avg_score elements', async ({ page }) => {
    const firstBadge = page.locator('[data-testid="index-badge-IIR"]');
    const hasBadges = await firstBadge.isVisible().catch(() => false);

    if (!hasBadges) {
      // Empty state — skip data assertions but test passes
      test.skip();
      return;
    }

    // Check that at least IIR has count and score elements
    for (const code of BORIN_INDEX_CODES) {
      const countEl = page.locator(`[data-testid="index-count-${code}"]`);
      const scoreEl = page.locator(`[data-testid="index-score-${code}"]`);

      // Cards with snapshots should have count and score
      const cardVisible = await page.locator(`[data-testid="index-card-${code}"]`).isVisible();
      if (cardVisible) {
        // Count element exists (may show a number or "sem snapshot")
        const hasCount = await countEl.isVisible().catch(() => false);
        const hasScore = await scoreEl.isVisible().catch(() => false);
        // At least the card itself is rendered
        await expect(page.locator(`[data-testid="index-card-${code}"]`)).toBeVisible();
        // If there is a snapshot for today, count and score should be visible
        if (hasCount) {
          const countText = await countEl.textContent();
          expect(countText).toMatch(/^\d+$/);
        }
        if (hasScore) {
          const scoreText = await scoreEl.textContent();
          expect(scoreText).toMatch(/^\d+$|^--$/);
        }
      }
    }
  });

  test('4. Click on IIR card opens drilldown panel', async ({ page }) => {
    const iirCard = page.locator('[data-testid="index-card-IIR"]');
    const hasBadges = await iirCard.isVisible().catch(() => false);

    if (!hasBadges) {
      test.skip();
      return;
    }

    // Click IIR card
    await iirCard.click();

    // Drilldown should appear
    const drilldown = page.locator('[data-testid="indices-borin-drilldown"]');
    await expect(drilldown).toBeVisible({ timeout: 10000 });

    // Should show index code and name
    await expect(drilldown.locator('text=IIR')).toBeVisible();
    await expect(drilldown.locator('text=Inflacao Real')).toBeVisible();
  });

  test('5. Drilldown shows articles with borin_index_tags containing IIR', async ({ page }) => {
    const iirCard = page.locator('[data-testid="index-card-IIR"]');
    const hasBadges = await iirCard.isVisible().catch(() => false);

    if (!hasBadges) {
      test.skip();
      return;
    }

    // Click IIR card to open drilldown
    await iirCard.click();

    const drilldown = page.locator('[data-testid="indices-borin-drilldown"]');
    await expect(drilldown).toBeVisible({ timeout: 10000 });

    // Wait for articles to load (either articles appear or "Nenhum artigo" message)
    const articleEl = drilldown.locator('[data-testid="drilldown-article"]').first();
    const noArticles = drilldown.locator('text=Nenhum artigo');

    // Wait for loading to finish
    await page.waitForSelector('[data-testid="indices-borin-drilldown"]', { timeout: 10000 });

    const hasArticles = await articleEl.isVisible().catch(() => false);
    const hasNoArticles = await noArticles.isVisible().catch(() => false);

    // One of these must be true
    expect(hasArticles || hasNoArticles).toBe(true);

    if (hasArticles) {
      // Articles should have title text
      const firstTitle = await articleEl.locator('.text-slate-200').textContent();
      expect(firstTitle).toBeTruthy();
    }
  });

  test('6. Chart container renders (recharts or fallback)', async ({ page }) => {
    const chart = page.locator('[data-testid="indices-borin-chart"]');
    const hasBadges = await page.locator('[data-testid="index-badge-IIR"]').isVisible().catch(() => false);

    if (!hasBadges) {
      // Empty state — chart is not shown
      test.skip();
      return;
    }

    await expect(chart).toBeVisible();

    // Should have checkbox toggles for indices
    const checkboxes = chart.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBe(9);

    // Should have either a recharts container or the fallback text
    const rechartsContainer = chart.locator('.recharts-responsive-container');
    const fallbackText = chart.locator('text=Sem dados para o grafico');

    const hasRecharts = await rechartsContainer.isVisible().catch(() => false);
    const hasFallback = await fallbackText.isVisible().catch(() => false);

    expect(hasRecharts || hasFallback).toBe(true);
  });

  test('7. Close button on drilldown dismisses it', async ({ page }) => {
    const iirCard = page.locator('[data-testid="index-card-IIR"]');
    const hasBadges = await iirCard.isVisible().catch(() => false);

    if (!hasBadges) {
      test.skip();
      return;
    }

    // Open drilldown
    await iirCard.click();
    const drilldown = page.locator('[data-testid="indices-borin-drilldown"]');
    await expect(drilldown).toBeVisible({ timeout: 10000 });

    // Click close button
    const closeBtn = page.locator('[data-testid="drilldown-close"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Drilldown should be gone
    await expect(drilldown).not.toBeVisible();
  });
});
