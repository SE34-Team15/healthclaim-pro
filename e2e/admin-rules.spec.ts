import { test, expect } from '@playwright/test';

test.describe('Admin Governance & Compliance Rules Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@healthclaim.pro');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should display compliance rules with AST definitions', async ({ page }) => {
    await page.goto('/admin/rules');
    await expect(page.getByRole('heading', { name: 'Compliance Rules Pipeline' })).toBeVisible();
    await expect(page.locator('button:has-text("New AST Rule")')).toBeVisible();
  });

  test('should navigate to Benefit Tiers page and list corporate plans', async ({ page }) => {
    await page.goto('/admin/policies');
    await expect(page.getByRole('heading', { name: 'Corporate Medical Benefit Tiers' })).toBeVisible();
    await expect(page.getByText('Standard Corporate Plan')).toBeVisible();
  });

  test('should navigate to Audit Logs page and view audit trails', async ({ page }) => {
    await page.goto('/audit-logs');
    await expect(page.getByRole('heading', { name: 'Audit Trails & Compliance Stream' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export CSV/i })).toBeVisible();
  });
});
