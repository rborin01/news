import { test, expect } from '@playwright/test';

const PASSWORD = process.env.TRUEPRESS_PASSWORD || '';

async function loginAndGoToOwnPress(page: any) {
  await page.goto('/');
  const passwordInput = page.locator('input[type="password"]');
  if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await passwordInput.fill(PASSWORD);
    await passwordInput.press('Enter');
  }
  await expect(
    page.locator('text=PRESS WATCH').or(page.locator('text=DASHBOARD'))
  ).toBeVisible({ timeout: 15000 });
  await page.locator('text=MINHA IMPRENSA').click();
  await expect(page.locator('text=Minha Imprensa')).toBeVisible({ timeout: 8000 });
}

test.describe('Own Press - Minha Imprensa', () => {
  test.beforeEach(async ({ page }) => { await loginAndGoToOwnPress(page); });

  test('should display Own Press panel', async ({ page }) => {
    await expect(page.locator('text=Minha Imprensa')).toBeVisible();
    await expect(page.locator('text=Gerar Novo Artigo')).toBeVisible();
  });

  test('should have topic input and generate button', async ({ page }) => {
    const topicInput = page.locator('input[placeholder*="Tema"]');
    await expect(topicInput).toBeVisible();
    const generateBtn = page.locator('button:has-text("Gerar Artigo")');
    await expect(generateBtn).toBeVisible();
  });

  test('should have category selector', async ({ page }) => {
    const categorySelect = page.locator('select');
    await expect(categorySelect).toBeVisible();
    const options = await categorySelect.locator('option').count();
    expect(options).toBeGreaterThan(3);
  });

  test('should disable generate button when topic is empty', async ({ page }) => {
    const generateBtn = page.locator('button:has-text("Gerar Artigo")');
    await expect(generateBtn).toBeDisabled();
  });

  test('should enable generate button when topic is filled', async ({ page }) => {
    const topicInput = page.locator('input[placeholder*="Tema"]');
    await topicInput.fill('IA no Agronegocio');
    const generateBtn = page.locator('button:has-text("Gerar Artigo")');
    await expect(generateBtn).toBeEnabled();
  });

  test('should show articles list section', async ({ page }) => {
    await expect(page.locator('text=Artigos')).toBeVisible({ timeout: 10000 });
  });

  test('should show empty state when no articles exist', async ({ page }) => {
    const emptyState = page.locator('text=Nenhum artigo gerado ainda');
    const articleCard = page.locator('text=MINHA IMPRENSA').locator('~*').locator('h3').first();
    await expect(emptyState.or(articleCard)).toBeVisible({ timeout: 10000 });
  });

  test('should generate article and show in list', async ({ page }) => {
    test.setTimeout(60000);
    const topicInput = page.locator('input[placeholder*="Tema"]');
    await topicInput.fill('Impacto da IA no Agronegocio Brasileiro 2026');
    const generateBtn = page.locator('button:has-text("Gerar Artigo")');
    await generateBtn.click();
    // Groq is fast — should complete within 30s
    const articleHeadline = page.locator('h3').first();
    await expect(articleHeadline).toBeVisible({ timeout: 35000 });
  });
});
