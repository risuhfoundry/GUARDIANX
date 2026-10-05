import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
const BASE_URL = 'https://guardianx-gamma.vercel.app';

test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run live browser verification.');

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

  // Navigate to Hardware / API via the sidebar button. The page heading
  // shares the same text as the Integration endpoints card, so we must
  // target the nav button explicitly.
  await page.click('nav#primary-navigation button[aria-label="Hardware / API"]');
  await page.getByRole('heading', { name: 'Hardware / API' }).waitFor({ timeout: 15_000 });

  // Create a new API key
  await page.fill('input[id="device-name"]', 'Playwright test device');
  await page.click('button:has-text("Create API key")');

  // Wait for the secret to appear
  const secretBox = page.locator('.hardware-secret__value');
  await expect(secretBox).toBeVisible({ timeout: 15_000 });
  const apiKey = await secretBox.textContent();
  expect(apiKey).toBeTruthy();
  expect(apiKey!.length).toBeGreaterThan(10);

  // Dismiss the secret box. A success toast is also shown after creation, so
  // target the button inside the secret box explicitly.
  await page.locator('.hardware-secret').getByRole('button', { name: 'Dismiss' }).click();
  await expect(secretBox).not.toBeVisible();

  // Stay on Hardware / API; if navigation changed, fail fast with a clear message.
  await expect(page.locator('nav#primary-navigation button[aria-label="Hardware / API"]')).toHaveAttribute('aria-current', 'page', { timeout: 10_000 });

  // Wait for the table to refresh after dismiss
  await page.waitForSelector('.admin-table--keys tbody tr', { state: 'visible', timeout: 20_000 });

  // Find the created key row and open manage dialog via its Manage button.
  const row = page.locator('.admin-table--keys tbody tr').filter({ hasText: 'Playwright test device' }).first();
  await expect(row).toBeVisible({ timeout: 10_000 });
  await row.getByRole('button', { name: 'Manage' }).click();

  // Wait for dialog and revoke the key
  const dialog = page.locator('.dialog--detail');
  await expect(dialog).toBeVisible();
  await page.click('button:has-text("Revoke key")');
  await expect(dialog).not.toBeVisible();

  // Confirm status shows revoked
  await expect(page.locator('.admin-table--keys tbody tr').filter({ hasText: 'Playwright test device' }).first().locator('.status-indicator')).toHaveText('revoked', { timeout: 20_000 });
});
