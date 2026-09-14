import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Offline suite: actual Leaflet geometry + Django, declared road fixtures,
  // no public tile downloads. Live basemap appearance is a separate QA gate.
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  await page.goto('/');
});

test('plans, links a stop, paginates logs, and exposes both sheets for printing', async ({
  page,
}, info) => {
  await page.getByLabel('Departure · terminal time').fill('2026-09-15T06:00');
  await page.getByRole('button', { name: 'Generate trip plan' }).click();
  await expect(page.getByRole('heading', { name: 'Chicago to Nashville' })).toBeVisible();
  await expect(page.getByText('1 fuel stops')).toBeVisible();
  await expect(page.locator('.leaflet-overlay-pane path').first()).toBeVisible();
  await page.getByRole('button', { name: /^Fuel stop at/ }).click();
  await expect(page.locator('.leaflet-popup')).toBeVisible();
  await page.getByRole('tab', { name: 'Daily logs (2)' }).click();
  const panel = page.getByRole('tabpanel');
  await expect(panel.getByLabel('Daily log for 2026-09-15')).toBeVisible();
  await panel.getByRole('button', { name: 'Next log day' }).click();
  await expect(panel.getByLabel('Daily log for 2026-09-16')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath('logs-screen.png'), fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.app-shell')).toBeHidden();
  await expect(page.locator('.print-logs .log-sheet')).toHaveCount(2);
  await page.pdf({
    path: info.outputPath('daily-logs.pdf'),
    format: 'Letter',
    printBackground: true,
  });
});

test('requires selection after a search and submits selected coordinates', async ({ page }) => {
  await page.getByLabel('Current location').fill('Denver');
  await page.getByRole('button', { name: 'Generate trip plan' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Search and select' })).toBeVisible();
  await page.getByRole('button', { name: 'Search current location' }).click();
  await page.getByRole('button', { name: /Denver, Colorado/ }).click();
  await page.getByRole('button', { name: 'Generate trip plan' }).click();
  await expect(page.getByRole('heading', { name: 'Denver to Nashville' })).toBeVisible();
});

test('validates cycle hours and permits retry after an API error', async ({ page }) => {
  await page.getByLabel('Current cycle used (hours)').fill('71');
  await page.getByRole('button', { name: 'Generate trip plan' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'between 0 and 70' })).toBeVisible();
  await page.getByLabel('Current cycle used (hours)').fill('0');
  await page.route(
    '**/api/plan',
    (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Route service unavailable.' }),
      }),
    { times: 1 },
  );
  await page.getByRole('button', { name: 'Generate trip plan' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Route service unavailable.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Generate trip plan' }).click();
  await expect(page.getByRole('heading', { name: 'Chicago to Nashville' })).toBeVisible();
  await page.getByLabel('Current cycle used (hours)').fill('65');
  await expect(page.getByText(/Inputs changed/)).toBeVisible();
});
