import { test, expect } from '@playwright/test';

test.describe('Authentication & RBAC Suite', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/HealthClaim Pro/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error toast on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@healthclaim.pro');
    await page.fill('input[type="password"]', 'WrongPassword!');
    await page.click('button[type="submit"]');

    await expect(page.locator('li[data-sonner-toast]')).toBeVisible();
  });

  test('should authenticate Employee and navigate to Dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'employee@healthclaim.pro');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');
    await expect(page.getByText('David Miller')).toBeVisible();
  });

  test('should authenticate Claim Officer and show Review Queue menu', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'officer@healthclaim.pro');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');
    await expect(page.getByText('Sarah Jenkins')).toBeVisible();
    await expect(page.getByRole('link', { name: /Claim Audit Queue/i })).toBeVisible();
  });

  test('should authenticate System Administrator and show Administration menus', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@healthclaim.pro');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');
    await expect(page.getByText('Alexander Vance')).toBeVisible();
    await expect(page.getByRole('link', { name: /Compliance Rules/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Benefit Tiers/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Audit Trails/i })).toBeVisible();
  });
});
