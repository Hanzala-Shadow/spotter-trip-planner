import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  await page.goto('/');
});

test('a full cycle starts with 34 hours off and prints every date from Directions', async ({
  page,
}, info) => {
  await page.getByLabel('Current cycle used (hours)').fill('70');
  await page.getByLabel('Departure · terminal time').fill('2026-12-31T23:30');
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/plan') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Generate trip plan' }).click();
  const plan = await (await response).json();
  expect(plan.events[0].kind).toBe('cycle_restart');
  expect(plan.events[0].seconds).toBe(34 * 3600);
  expect(plan.logs.length).toBeGreaterThanOrEqual(3);
  expect(plan.logs.some((log: { date: string }) => log.date.startsWith('2027'))).toBe(true);
  for (const log of plan.logs)
    expect(Object.values(log.totals).reduce((a: number, b) => a + Number(b), 0)).toBe(86400);
  await page.getByRole('tab', { name: `Daily logs (${plan.logs.length})` }).click();
  const panel = page.getByRole('tabpanel');
  for (let i = 0; i < plan.logs.length; i++) {
    await expect(panel.getByLabel(`Daily log for ${plan.logs[i].date}`)).toBeVisible();
    if (i + 1 < plan.logs.length) await panel.getByRole('button', { name: 'Next log day' }).click();
  }
  await expect(panel.getByRole('button', { name: 'Next log day' })).toBeDisabled();
  await page.getByRole('tab', { name: 'Directions', exact: true }).click();
  await expect(
    page.getByRole('tabpanel').getByText('Drive to Nashville, Tennessee', { exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.print-logs .log-sheet')).toHaveCount(plan.logs.length);
  await expect(page.locator('.app-shell')).toBeHidden();
  await page.pdf({
    path: info.outputPath('cycle-restart-all-dates.pdf'),
    format: 'Letter',
    printBackground: true,
  });
});

test('identical locations have no driving and two service hours across midnight', async ({
  page,
}, info) => {
  for (const label of ['Pickup location', 'Dropoff location']) {
    await page.getByLabel(label, { exact: true }).fill('Chicago');
    await page.getByLabel(label, { exact: true }).press('Enter');
    await page.getByRole('button', { name: /Chicago, Illinois/ }).click();
  }
  await page.getByLabel('Departure · terminal time').fill('2028-02-29T23:30');
  await page.getByRole('button', { name: /Driver & vehicle details/ }).click();
  await page.getByLabel('Driver name', { exact: true }).fill('Test Driver');
  await page.getByLabel('Carrier', { exact: true }).fill('Assessment Carrier');
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/plan') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Generate trip plan' }).click();
  const plan = await (await response).json();
  expect(plan.summary.miles).toBe(0);
  expect(plan.summary.driving_seconds).toBe(0);
  expect(plan.summary.elapsed_seconds).toBe(7200);
  expect(plan.events.map((e: { kind: string }) => e.kind)).toEqual(['pickup', 'dropoff']);
  expect(plan.logs.map((log: { date: string }) => log.date)).toEqual(['2028-02-29', '2028-03-01']);
  await expect(page.getByRole('heading', { name: 'Chicago to Chicago' })).toBeVisible();
  await page.getByRole('tab', { name: 'Daily logs (2)' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Test Driver');
  await expect(page.getByRole('tabpanel')).toContainText('Assessment Carrier');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: info.outputPath('zero-distance-midnight.pdf'),
    format: 'Letter',
    printBackground: true,
  });
});

test('search can recover from empty results and provider errors using the keyboard', async ({
  page,
}) => {
  const field = page.getByLabel('Current location', { exact: true });
  await field.fill('No results');
  await field.press('Enter');
  await expect(page.getByText('No US locations found. Try a city and state.')).toBeVisible();
  await field.fill('Unavailable');
  await field.press('Enter');
  await expect(page.getByText('Location search is unavailable. Please try again.')).toBeVisible();
  await field.fill('Denver');
  await field.press('Enter');
  const option = page.getByRole('button', { name: /Denver, Colorado/ });
  await option.press('Enter');
  await expect(field).toHaveValue('Denver, Colorado');
  await page.getByRole('button', { name: 'Generate trip plan' }).click();
  await expect(page.getByRole('heading', { name: 'Denver to Nashville' })).toBeVisible();
});

test('gateway errors recover and changed inputs cannot silently print old details', async ({
  page,
}) => {
  await page.route(
    '**/api/plan',
    (route) =>
      route.fulfill({ status: 502, contentType: 'text/html', body: '<h1>Bad gateway</h1>' }),
    { times: 1 },
  );
  await page.getByRole('button', { name: 'Generate trip plan' }).click();
  await expect(
    page.getByRole('alert').filter({
      hasText: 'The trip service returned an unreadable response. Please try again.',
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Generate trip plan' }).click();
  await expect(page.getByRole('heading', { name: 'Chicago to Nashville' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print logs' })).toBeEnabled();
  await page.getByLabel('Current cycle used (hours)').fill('68');
  await expect(page.getByRole('button', { name: 'Print logs' })).toBeDisabled();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.print-stale-notice')).toBeVisible();
});

test('long optional details fit the screen and remain complete in printed logs', async ({
  page,
}, info) => {
  await page.getByRole('button', { name: /Driver & vehicle details/ }).click();
  for (const label of [
    'Driver name',
    'Carrier',
    'Vehicle / trailer',
    'Shipping document',
    'Office / terminal',
  ]) {
    await page
      .getByLabel(label, { exact: true })
      .fill(('Long ' + label + ' ').repeat(20).slice(0, 150));
  }
  await page.getByLabel('Departure · terminal time').fill('2026-09-15T06:00');
  await page.getByRole('button', { name: 'Generate trip plan' }).click();
  await expect(page.getByRole('heading', { name: 'Chicago to Nashville' })).toBeVisible();
  await page.getByRole('tab', { name: 'Daily logs (2)' }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath('long-details-screen.png'), fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: info.outputPath('long-details.pdf'),
    format: 'Letter',
    printBackground: true,
  });
});

test('assumptions dialog supports Escape and restores keyboard focus', async ({ page }) => {
  const opener = page.getByRole('button', { name: 'Planning rules & assumptions', exact: true });
  await opener.click();
  await expect(page.getByRole('dialog')).toContainText('70 hours in 8 days');
  await page.getByRole('button', { name: 'Got it' }).press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(opener).toBeFocused();
});
