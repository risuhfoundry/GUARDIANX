import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.GUARDIANX_TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.GUARDIANX_TEST_ADMIN_PASSWORD;
const BASE_URL = 'https://guardianx-gamma.vercel.app';

test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Set GUARDIANX_TEST_ADMIN_EMAIL and GUARDIANX_TEST_ADMIN_PASSWORD to run live browser verification.');

test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(30_000);
});

test('login and redirect to workspace', async ({ page }) => {
  await page.goto(BASE_URL);

  // The landing page links into the app at /app, where the login form lives.
  await page.click('text=Sign in');
  await page.waitForURL((url) => url.pathname.startsWith('/app'), { timeout: 15_000 });
  await page.waitForSelector('input[name="email"]', { state: 'visible', timeout: 15_000 });
  await page.fill('input[name="email"]', ADMIN_EMAIL!);
  await page.fill('input[name="password"]', ADMIN_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname.startsWith('/app'), { timeout: 15_000 });
  expect(page.url()).toContain('/app');
});

test('Admin Hardware/API page: generate and revoke an API key', async ({ page }) => {
  await page.goto(`${BASE_URL}/app`);

  await page.waitForSelector('input[name="email"]', { state: 'visible', timeout: 15_000 });
  await page.fill('input[name="email"]', ADMIN_EMAIL!);
  await page.fill('input[name="password"]', ADMIN_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname.startsWith('/app'), { timeout: 15_000 });

  // Navigate to Hardware / API. Section changes are client-side only, so wait
  // for the page heading instead of a URL change.
  await page.click('text=Hardware / API');
  await page.getByRole('heading', { name: 'Hardware / API' }).waitFor({ timeout: 15_000 });

  // Create a new API key
  await page.fill('input[id="device-name"]', 'Playwright test device');
  await page.click('button:has-text("Create API key")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/hardware-after-create.png', fullPage: true });
  console.log('hardware page text after create:', await page.locator('body').innerText().then(t => t.slice(0, 800)));

  // Wait for the secret to appear
  const secretBox = page.locator('.hardware-secret__value');
  await expect(secretBox).toBeVisible({ timeout: 15_000 });
  const apiKey = await secretBox.textContent();
  expect(apiKey).toBeTruthy();
  expect(apiKey!.length).toBeGreaterThan(10);

  // Dismiss the secret modal
  await page.click('button:has-text("Dismiss")');
  await expect(secretBox).not.toBeVisible();

  // Find the created key row and open manage dialog
  const row = page.locator('table tbody tr:has-text("Playwright test device")');
  await expect(row).toBeVisible();
  await row.click();

  // Wait for dialog and revoke the key
  const dialog = page.locator('.dialog--detail');
  await expect(dialog).toBeVisible();
  await page.click('button:has-text("Revoke key")');
  await expect(dialog).not.toBeVisible();

  // Confirm status shows revoked
  await expect(page.locator('table tbody tr:has-text("Playwright test device") .status-indicator')).toHaveText('revoked');
});
