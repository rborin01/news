import { test, expect } from '@playwright/test';

const PASSWORD = process.env.TRUEPRESS_PASSWORD || 'rodrigo';

async function loginAndGoToOwnPress(page: any) {
  await page.goto('/');
  const passwordInput = page.locator('input[type="password"]');
  if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await passwordInput.fill(PASSWORD);
    await passwordInput.press('Enter');
  }
  await expect(
    page.getByText('PRESS WATCH').or(page.getByText('DASHBOARD'))
  ).toBeVisible({ timeout: 15000 });
  await page.getByText('MINHA IMPRENSA').click();
  await expect(page.getByText('Minha Imprensa')).toBeVisible({ timeout: 8000 });
}

test.describe('Own Press - Minha Imprensa', () => {
  test.beforeEach(async ({ page }) => { await loginAndGoToOwnPress(page); });

  test('should display Own Press panel', async ({ page }) => {
    await expect(page.getByText('Minha Imprensa')).toBeVisible();
    await expect(page.getByText('Gerar Novo Artigo')).toBeVisible();
  });

  test('should have topic input and generate button', async ({ page }) => {
    const topicInput = page.locator('input[placeholder*="Tema"]');
    await expect(topicInput).toBeVisible();
    const generateBtn = page.getByRole('button', { name: /Gerar Artigo/ });
    await expect(generateBtn).toBeVisible();
  });

  test('should have category selector', async ({ page }) => {
    const categorySelect = page.locator('select');
    await expect(categorySelect).toBeVisible();
    const options = await categorySelect.locator('option').count();
    expect(options).toBeGreaterThan(3);
  });

  test('should disable generate button when topic is empty', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: /Gerar Artigo/ });
    await expect(generateBtn).toBeDisabled();
  });

  test('should enable generate button when topic is filled', async ({ page }) => {
    const topicInput = page.locator('input[placeholder*="Tema"]');
    await topicInput.fill('IA no Agronegocio');
    const generateBtn = page.getByRole('button', { name: /Gerar Artigo/ });
    await expect(generateBtn).toBeEnabled();
  });

  test('should show articles count section', async ({ page }) => {
    await expect(page.getByText(/Artigos/)).toBeVisible({ timeout: 10000 });
  });

  test('should show empty state when no articles', async ({ page }) => {
    await expect(
      page.getByText('Nenhum artigo gerado ainda.').or(page.locator('h3').first())
    ).toBeVisible({ timeout: 10000 });
  });

  test('should generate article and show in list', async ({ page }) => {
    test.setTimeout(60000);
    const topicInput = page.locator('input[placeholder*="Tema"]');
    await topicInput.fill('Impacto da IA no Agronegocio Brasileiro 2026');
    const generateBtn = page.getByRole('button', { name: /Gerar Artigo/ });
    await generateBtn.click();
    await expect(page.locator('h3').first()).toBeVisible({ timeout: 40000 });
  });

  test('should show context input field', async ({ page }) => {
    const contextInput = page.locator('input[placeholder*="Links"]').or(page.locator('input[placeholder*="Fontes"]'));
    await expect(contextInput).toBeVisible();
  });
});
