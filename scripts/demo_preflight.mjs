import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const baseURL = process.env.DEMO_BASE_URL || 'https://spotter-trip-planner-indol.vercel.app';
const departure = '2026-09-15T06:00';
const output = 'test-results/demo-preflight';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const report = { checked_at: new Date().toISOString(), base_url: baseURL, trips: [] };

function validatePlan(plan) {
  assert.equal(plan.route.legs.length, 2);
  assert.equal(plan.summary.departure, departure + ':00-06:00');
  assert.equal(plan.utc_offset_minutes, -360);
  for (const log of plan.logs) {
    assert.equal(
      Object.values(log.totals).reduce((a, b) => a + b, 0),
      86400,
    );
  }
  for (const kind of ['pickup', 'dropoff']) {
    const events = plan.events.filter((event) => event.kind === kind);
    assert.equal(events.length, 1);
    assert.equal(events[0].seconds, 3600);
  }
  const fuelPositions = [
    0,
    ...plan.events.filter((event) => event.kind === 'fuel').map((event) => event.route_miles),
    plan.summary.miles,
  ];
  for (let index = 1; index < fuelPositions.length; index++) {
    assert.ok(fuelPositions[index] - fuelPositions[index - 1] <= 1000.000001);
  }
}

async function generate(page, sample) {
  await page.getByRole('button', { name: sample, exact: true }).click();
  await page.getByLabel('Departure · terminal time').fill(departure);
  const response = page.waitForResponse(
    (response) => response.url().endsWith('/api/plan') && response.request().method() === 'POST',
    { timeout: 60000 },
  );
  const started = Date.now();
  await page.getByRole('button', { name: 'Generate trip plan', exact: true }).click();
  const result = await response;
  assert.equal(result.status(), 200, await result.text());
  const plan = await result.json();
  validatePlan(plan);
  await expect(page.getByRole('button', { name: 'Print logs', exact: true })).toBeEnabled();
  const evidence = {
    sample,
    request_seconds: (Date.now() - started) / 1000,
    summary: plan.summary,
    logs: plan.logs.map((log) => ({ date: log.date, miles: log.miles, totals: log.totals })),
    events: plan.events.map((event) => ({
      kind: event.kind,
      start: event.start,
      end: event.end,
      seconds: event.seconds,
      miles: event.miles,
      route_miles: event.route_miles,
      location: event.start_place.label,
    })),
  };
  report.trips.push(evidence);
  return plan;
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(20000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const health = await page.request.get(baseURL + '/api/health');
  assert.equal(health.status(), 200);
  assert.equal((await health.json()).backend, 'Django');
  await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });

  await page.getByRole('button', { name: /Driver & vehicle details/ }).click();
  for (const [label, value] of Object.entries({
    'Driver name': 'Demo Driver',
    Carrier: 'Demo Carrier',
    'Vehicle / trailer': 'Truck 101 / Trailer 201',
    'Shipping document': 'DEMO-001',
    'Office / terminal': 'Demo Terminal',
  })) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  const main = await generate(page, 'Multi-day');
  assert.equal(main.summary.fuel_stops, 1);
  assert.equal(main.summary.daily_rests, 2);
  assert.equal(main.summary.cycle_restarts, 0);
  assert.equal(main.logs.length, 3);
  assert.ok(main.summary.miles > 1400 && main.summary.miles < 1500);
  await expect(
    page.getByRole('heading', { name: 'Los Angeles to Dallas', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.leaflet-overlay-pane path').first()).toBeVisible();
  await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible();
  await page.getByRole('button', { name: /^Fuel stop at/ }).click();
  await expect(page.locator('.leaflet-popup')).toContainText('30-minute fuel stop');
  await page.getByRole('button', { name: 'Fit route', exact: true }).click();
  await page.screenshot({ path: output + '/route-desktop.png', fullPage: true });

  await page.getByRole('tab', { name: 'Daily logs (3)', exact: true }).click();
  for (let index = 0; index < main.logs.length; index++) {
    await expect(
      page.getByRole('tabpanel').getByLabel('Daily log for ' + main.logs[index].date),
    ).toBeVisible();
    if (index < main.logs.length - 1) {
      await page.getByRole('button', { name: 'Next log day', exact: true }).click();
    }
  }
  await expect(page.getByRole('button', { name: 'Next log day', exact: true })).toBeDisabled();
  await page.getByRole('tab', { name: 'Directions', exact: true }).click();
  assert.ok((await page.getByRole('tabpanel').locator('ol li').count()) > 0);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.print-logs .log-sheet')).toHaveCount(3);
  await page.pdf({ path: output + '/multi-day-logs.pdf', format: 'Letter', printBackground: true });
  await page.emulateMedia({ media: 'screen' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Daily logs (3)', exact: true }).click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: output + '/logs-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel('Current cycle used (hours)').fill('68');
  await expect(page.getByRole('button', { name: 'Print logs', exact: true })).toBeDisabled();

  const cycle = await generate(page, 'Cycle restart');
  assert.equal(cycle.events[0].kind, 'drive');
  assert.equal(cycle.events[0].seconds, 7200);
  assert.equal(cycle.events[1].kind, 'cycle_restart');
  assert.equal(cycle.events[1].seconds, 34 * 3600);
  assert.equal(cycle.summary.cycle_restarts, 1);
  assert.equal(cycle.logs.length, 3);
  assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
  report.status = 'passed';
  await writeFile(output + '/report.json', JSON.stringify(report, null, 2) + '\n');
  console.log('DEMO_PREFLIGHT ' + JSON.stringify(report));
} finally {
  await browser.close();
}
