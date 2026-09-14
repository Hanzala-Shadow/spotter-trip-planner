// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LocationField from './LocationField';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('searches only on request and selects the returned coordinates', async () => {
  const place = { label: 'Denver, Colorado', lat: 39.7392, lon: -104.9903 };
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ places: [place] }) });
  vi.stubGlobal('fetch', fetchMock);
  const change = vi.fn();
  render(
    <LocationField label="Current location" value={null} onChange={change} disabled={false} />,
  );
  fireEvent.change(screen.getByLabelText('Current location'), { target: { value: 'Denver' } });
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Search current location' }));
  fireEvent.click(await screen.findByRole('button', { name: /Denver, Colorado/ }));
  expect(change).toHaveBeenLastCalledWith(place);
  expect(fetchMock.mock.calls[0][0]).toBe('/api/locations?q=Denver');
});
it('discards an old search response when the text has changed', async () => {
  let resolve!: (value: unknown) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    ),
  );
  render(
    <LocationField label="Current location" value={null} onChange={() => {}} disabled={false} />,
  );
  fireEvent.change(screen.getByLabelText('Current location'), { target: { value: 'Denver' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search current location' }));
  fireEvent.change(screen.getByLabelText('Current location'), { target: { value: 'Dallas' } });
  await act(async () => {
    resolve({
      ok: true,
      json: async () => ({ places: [{ label: 'Denver, Colorado', lat: 39, lon: -104 }] }),
    });
  });
  await waitFor(() => expect(screen.getByLabelText('Current location')).toHaveValue('Dallas'));
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
});
it('shows a useful message when search returns HTML instead of JSON', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    }),
  );
  render(
    <LocationField label="Current location" value={null} onChange={() => {}} disabled={false} />,
  );
  fireEvent.change(screen.getByLabelText('Current location'), { target: { value: 'Chicago' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search current location' }));
  expect(
    await screen.findByText(
      'The location service returned an unreadable response. Please try again.',
    ),
  ).toBeInTheDocument();
});
