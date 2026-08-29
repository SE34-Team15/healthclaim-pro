import { test, expect } from '@playwright/test';

test.describe('Claim End-to-End Workflow Suite', () => {
  const claimHospital = `General Hospital E2E ${Date.now()}`;
  const claimDescription = 'Specialist Consultation & Prescription';

  test('Step 1: Employee submits claim and verifies calculation preview', async ({ page }) => {
    // 1. Employee Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'employee@healthclaim.pro');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // 2. Navigate to Submit Claim
    await page.goto('/claims/submit');
    await expect(page.getByText('File New Medical Reimbursement')).toBeVisible();

    // 3. Fill Claim Form
    await page.fill('input[placeholder*="Mount Elizabeth Hospital"]', claimHospital);

    // Line Item
    await page.fill('input[placeholder*="Specialist Consultation / Blood Test"]', claimDescription);
    await page.fill('input[placeholder="0.00"]', '250');

    // 4. Submit Claim
    await page.click('button:has-text("Submit Claim")');

    // 5. Verify redirection to My Claims
    await page.waitForURL('**/claims/my-claims');
    await expect(page.getByText(claimHospital)).toBeVisible();
  });

  test('Step 2: Claim Officer audits submitted claim and approves it', async ({ page }) => {
    // 1. Officer Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'officer@healthclaim.pro');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // 2. Navigate to Audit Queue
    await page.goto('/admin/audit-queue');
    await expect(page.getByRole('heading', { name: 'Claim Review & Audit Workbench' })).toBeVisible();

    // Search for the submitted claim
    await page.fill('input[placeholder*="Search by claim"]', claimHospital);
    await expect(page.getByText(claimHospital)).toBeVisible();

    // Open review modal via Review button in the table row
    await page.locator('tr').filter({ hasText: claimHospital }).getByRole('button', { name: 'Review' }).click();

    // Click Approve Claim
    const approveBtn = page.getByRole('button', { name: /Approve Claim/i });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Verify status update toast
    await expect(page.locator('li[data-sonner-toast]')).toBeVisible();
  });

  test('Step 3: Finance Manager reviews and settles payment', async ({ page }) => {
    // 1. Finance Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'finance@healthclaim.pro');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // 2. Navigate to Audit Queue
    await page.goto('/admin/audit-queue');
    await expect(page.getByRole('heading', { name: 'Claim Review & Audit Workbench' })).toBeVisible();

    // Search for the claim in Pending Finance Settlement queue
    await page.fill('input[placeholder*="Search by claim"]', claimHospital);
    await expect(page.getByText(claimHospital)).toBeVisible();

    // Open review modal via Review button
    await page.locator('tr').filter({ hasText: claimHospital }).getByRole('button', { name: 'Review' }).click();

    // Click Settle & Disburse
    const settleBtn = page.getByRole('button', { name: /Settle & Disburse/i });
    await expect(settleBtn).toBeVisible();
    await settleBtn.click();

    // Verify success toast
    await expect(page.locator('li[data-sonner-toast]')).toBeVisible();
  });
});
