/**
 * W33 -- Piloto Automatico (Sidebar Auto-Collect Toggle)
 *
 * RED phase -- written before implementation.
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

test.describe('W33 -- Piloto Automatico', () => {

  test('autopilot toggle button exists in sidebar with correct data-testid', async ({ page }) => {
    await authenticate(page);
    const toggle = page.locator('[data-testid="autopilot-toggle"]');
    await expect(toggle).toBeVisible({ timeout: 5000 });
  });

  test('autopilot toggle shows OFF state by default (no localStorage)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('truepress_autopilot'));
    await authenticate(page);
    const countdown = page.locator('[data-testid="autopilot-countdown"]');
    await expect(countdown).not.toBeVisible({ timeout: 3000 });
  });

  test('clicking toggle switches to ON and shows countdown', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('truepress_autopilot'));
    await authenticate(page);
    const toggle = page.locator('[data-testid="autopilot-toggle"]');
    await toggle.click();
    const countdown = page.locator('[data-testid="autopilot-countdown"]');
    await expect(countdown).toBeVisible({ timeout: 5000 });
    await expect(countdown).toHaveText(/\d{1,2}:\d{2}/);
  });

  test('autopilot state persists in localStorage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('truepress_autopilot'));
    await authenticate(page);
    const toggle = page.locator('[data-testid="autopilot-toggle"]');
    await toggle.click();
    const stored = await page.evaluate(() => localStorage.getItem('truepress_autopilot'));
    expect(stored).toBe('true');
    await toggle.click();
    const storedAfter = await page.evaluate(() => localStorage.getItem('truepress_autopilot'));
    expect(storedAfter).toBe('false');
  });

  test('autopilot status container exists with data-testid', async ({ page }) => {
    await authenticate(page);
    const status = page.locator('[data-testid="autopilot-status"]');
    await expect(status).toBeVisible({ timeout: 5000 });
  });

  test('clicking toggle twice returns to OFF and hides countdown', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('truepress_autopilot'));
    await authenticate(page);
    const toggle = page.locator('[data-testid="autopilot-toggle"]');
    await toggle.click();
    const countdown = page.locator('[data-testid="autopilot-countdown"]');
    await expect(countdown).toBeVisible({ timeout: 5000 });
    await toggle.click();
    await expect(countdown).not.toBeVisible({ timeout: 3000 });
  });

  test('autopilot restores ON state from localStorage on reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('truepress_autopilot', 'true'));
    await authenticate(page);
    const countdown = page.locator('[data-testid="autopilot-countdown"]');
    await expect(countdown).toBeVisible({ timeout: 10000 });
  });

});
