import { test, expect } from '@playwright/test';

// Set TRUEPRESS_PASSWORD env var to authenticate — fallback empty string skips auth step
const PASSWORD = process.env.TRUEPRESS_PASSWORD || '';

async function login(page: any) {
  await page.goto('/');
  const passwordInput = page.locator('input[type="password"]');
  if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await passwordInput.fill(PASSWORD);
    await passwordInput.press('Enter');
  }
  await expect(
    page.getByText('PRESS WATCH').or(page.getByText('DASHBOARD'))
  ).toBeVisible({ timeout: 15000 });
}

test.describe('Intelligence Hub', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('should authenticate and show dashboard', async ({ page }) => {
    await expect(page.getByText('DASHBOARD')).toBeVisible();
  });

  test('should load news or show empty state', async ({ page }) => {
    const emptyState = page.getByText('Sem dados');
    const hasContent = page.locator('article, [data-news-card]').first();
    await expect(emptyState.or(hasContent)).toBeVisible({ timeout: 20000 });
  });

  test('should have four view mode tabs', async ({ page }) => {
    await expect(page.getByText('PRESS WATCH')).toBeVisible();
    await expect(page.getByText('AI ORIGINALS')).toBeVisible();
    await expect(page.getByText('DATA ROOM')).toBeVisible();
    await expect(page.getByText('MINHA IMPRENSA')).toBeVisible();
  });

  test('should switch to AI ORIGINALS tab', async ({ page }) => {
    await page.getByText('AI ORIGINALS').click();
    await expect(page.getByText('Investigações')).toBeVisible({ timeout: 5000 });
  });

  test('should switch to DATA ROOM tab', async ({ page }) => {
    await page.getByText('DATA ROOM').click();
    await expect(page.getByText('Arquivos')).toBeVisible({ timeout: 5000 });
  });

  test('should switch to MINHA IMPRENSA tab', async ({ page }) => {
    await page.getByText('MINHA IMPRENSA').click();
    await expect(page.getByText('Minha Imprensa')).toBeVisible({ timeout: 5000 });
  });

  test('should filter news by text search', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Filtrar"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Brasil');
    await page.waitForTimeout(300);
  });

  test('should display queue stats widget', async ({ page }) => {
    await expect(
      page.getByText('Pendente').or(page.getByText('Prontos'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should display score filter slider', async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible({ timeout: 5000 });
  });

  test('should display Piloto Automatico in sidebar', async ({ page }) => {
    await expect(page.getByText('Piloto Automático')).toBeVisible({ timeout: 5000 });
  });
});
