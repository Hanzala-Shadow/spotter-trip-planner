// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import App from './App';
import requestFixture from './__fixtures__/request.json';
import planFixture from './__fixtures__/plan.json';

// Map behavior belongs to browser checks; keep form and log tests deterministic.
vi.mock('./MapPanel', () => ({ default: () => <div aria-label="Trip route map" /> }));
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function generate() {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => structuredClone(planFixture) });
  render(<App />);
  fireEvent.change(screen.getByLabelText('Departure · terminal time'), {
    target: { value: requestFixture.departure },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Generate trip plan' }));
  await screen.findByRole('heading', { name: 'Chicago to Nashville' });
}
describe('Trip workflow', () => {
  it('sends the exact Django request contract and renders computed results', async () => {
    await generate();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/plan');
    expect(JSON.parse(options.body)).toEqual(requestFixture);
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(screen.getByText('1 fuel stops')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Daily logs (2)' })).toBeInTheDocument();
  });
  it('shows every log day with a connected graph and 24-hour totals', async () => {
    await generate();
    fireEvent.click(screen.getByRole('tab', { name: 'Daily logs (2)' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByLabelText('Daily log for 2026-09-15')).toBeInTheDocument();
    expect(within(panel).getByRole('img')).toBeInTheDocument();
    expect(within(panel).getByText('24:00')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Previous log day' })).toBeDisabled();
    fireEvent.click(within(panel).getByRole('button', { name: 'Next log day' }));
    expect(within(panel).getByLabelText('Daily log for 2026-09-16')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Next log day' })).toBeDisabled();
    expect(document.querySelectorAll('.print-logs .log-sheet')).toHaveLength(2);
    expect(
      document.querySelector('.log-graph polyline')?.getAttribute('points')?.split(' ').length,
    ).toBeGreaterThan(4);
  });
  it('keeps results visibly stale until changed inputs are regenerated', async () => {
    await generate();
    fireEvent.change(screen.getByLabelText('Current cycle used (hours)'), {
      target: { value: '65' },
    });
    expect(screen.getByText(/Inputs changed/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chicago to Nashville' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('rejects invalid hours before contacting the server', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Current cycle used (hours)'), {
      target: { value: '71' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate trip plan' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Cycle hours must be between 0 and 70.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('requires location selection after a location is edited', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Current location'), { target: { value: 'Denver' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate trip plan' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Search and select all three locations.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('shows provider errors and re-enables retry without invented results', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'No drivable route was found.' }),
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate trip plan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No drivable route was found.');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Generate trip plan' })).toBeEnabled(),
    );
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });
  it('exposes directions and displays limitations in an accessible dialog', async () => {
    await generate();
    fireEvent.click(screen.getByRole('tab', { name: 'Directions' }));
    expect(
      within(screen.getByRole('tabpanel')).getByText('Drive to Nashville, Tennessee'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Planning rules & assumptions' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('70 hours in 8 days');
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
