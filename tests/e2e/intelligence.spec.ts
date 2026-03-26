import { test, expect } from '@playwright/test';

const PASSWORD = process.env.TRUEPRESS_PASSWORD || '';

async function login(page: any) {
  await page.goto('/');
  const passwordInput = page.locator('input[type="password"]');
  if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await passwordInput.fill(PASSWORD);
    await passwordInput.press('Enter');
  }
  await expect(
    page.locator('text=PRESS WATCH').or(page.locator('text=DASHBOARD'))
  ).toBeVisible({ timeout: 15000 });
}

test.describe('Intelligence Hub', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('should authenticate and show dashboard', async ({ page }) => {
    await expect(page.locator('text=DASHBOARD')).toBeVisible();
  });

  test('should load news or show empty state', async ({ page }) => {
    const newsCard = page.locator('[class*="bg-white"][class*="rounded"]').first();
    const emptyState = page.locator('text=Sem dados');
    await expect(newsCard.or(emptyState)).toBeVisible({ timeout: 20000 });
  });

  test('should have four view mode tabs', async ({ page }) => {
    await expect(page.locator('text=PRESS WATCH')).toBeVisible();
    await expect(page.locator('text=AI ORIGINALS')).toBeVisible();
    await expect(page.locator('text=DATA ROOM')).toBeVisible();
    await expect(page.locator('text=MINHA IMPRENSA')).toBeVisible();
  });

  test('should switch to AI ORIGINALS tab', async ({ page }) => {
    await page.locator('text=AI ORIGINALS').click();
    await expect(page.locator('text=Investigações')).toBeVisible({ timeout: 5000 });
  });

  test('should switch to DATA ROOM tab', async ({ page }) => {
    await page.locator('text=DATA ROOM').click();
    await expect(page.locator('text=Arquivos')).toBeVisible({ timeout: 5000 });
  });

  test('should filter news by text search', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Filtrar"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Brasil');
    await page.waitForTimeout(300);
  });

  test('should display queue stats widget', async ({ page }) => {
    const pendingBadge = page.locator('text=Pendente');
    const doneBadge = page.locator('text=Prontos');
    await expect(pendingBadge.or(doneBadge)).toBeVisible({ timeout: 5000 });
  });

  test('should display score filter slider', async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible({ timeout: 5000 });
  });

  test('should display Piloto Automatico in sidebar', async ({ page }) => {
    await expect(page.locator('text=Piloto Automático')).toBeVisible({ timeout: 5000 });
  });

  test('should have MINHA IMPRENSA tab', async ({ page }) => {
    await expect(page.locator('text=MINHA IMPRENSA')).toBeVisible();
  });
});
