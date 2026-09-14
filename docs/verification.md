# Verification

## Automated suite

The cleaned application passed **177 named tests**: 123 Python tests, 18 React component tests and 36 browser cases. Two backend tests additionally exercise 1,620 generated schedules inside that count.

[Passing main-branch verification](https://github.com/Hanzala-Shadow/spotter-trip-planner/actions/runs/34849085988), application commit `1fae068478a2a6341ea92a4d7c06d1c4aa440096`.

Python formatting and unused-code checks, TypeScript checks, the production build and Django system checks also passed.

| Area | Coverage |
| --- | --- |
| Scheduling | 11-hour driving limit, 14-hour window, eight-hour break threshold, qualifying daily rest and 70-hour cycle |
| Fuel and service | Cumulative gaps no greater than 1,000 miles; exactly one hour each for pickup and dropoff |
| Boundary cases | Zero-distance legs, fractional cycle usage, exact clock limits, midnight, leap-day, year-end and repeated restarts |
| Daily records | Continuous segments, exact 24-hour totals, conserved mileage and every trip date represented |
| API | Invalid types, huge integers, malformed dates/JSON, request limits, method/media errors and all Vercel WSGI adapters |
| Providers | Search filtering, malformed envelopes and geometry, routing failures, optional label fallback and bounded requests |
| Interface | Required selection, retry after service errors, stale-result notice and print protection, keyboard search, dialog focus and log navigation |

The independent scheduler audit recomputes clocks from status intervals rather than trusting reset labels or counters. It checks each driving interval, intersects events with calendar dates, and independently verifies distance and service durations.

## Browser and print coverage

Chromium cases run at 1440 × 1000, 390 × 844, 320 × 740 and 768 × 1024. They use the built React app and real Django application with declared provider fixtures.

The earlier print review covered 16 PDFs and 40 total US Letter pages. All ten distinct page designs were rendered and inspected: a four-day year-end cycle restart, zero-distance service across leap-day midnight, a normal multi-day route and maximum-length optional details. Each scenario produced identical page-render hashes across all four viewports. No missing dates, blank leading pages or clipped text were found. Narrow graphs scroll within the worksheet without widening the page.

## Live recording preflight

[Successful recording preflight](https://github.com/Hanzala-Shadow/spotter-trip-planner/actions/runs/34849627063), 14 September 2026, 13:30 UTC.

Vercel deployment `dpl_B2agnKaKknWCjnXyJU2UV9UUKy2X` was READY at the application commit above, and the public HTML referenced the same JavaScript and CSS assets as the tested build before this check started. Subsequent evidence-document updates do not change application code.

This check used the public Vercel application with real Photon/OSRM/OpenStreetMap services. It verified health, route generation, loaded map tiles, route paths, the fuel popup, directions, all log dates, printing, a 390-pixel layout, stale-print protection and absence of uncaught page errors.

Fixed departure: 15 September 2026 at 06:00, terminal UTC−06:00.

| Preset | Cycle used | Miles | Driving | Total elapsed | Logs | Fuel / daily rest / cycle restart |
| --- | ---: | ---: | --- | --- | ---: | --- |
| Multi-day | 20 h | 1,438.1 | 26:08:53 | 48:38:53 | 3 | 1 / 2 / 0 |
| Cycle restart | 68 h | 714.8 | 13:30:29 | 59:30:29 | 3 | 0 / 1 / 1 |

Measured generation times were 7.249 and 4.327 seconds for this run; these are observations, not latency guarantees. Public routing estimates and optional nearby labels can change. The script records the current values in its JSON report. Some optional nearby place names used the documented coordinate fallback in this run; route generation, markers and scheduling remained available.

Run `npm run demo:preflight` or the **Demo preflight** workflow before recording. Its report, route screenshot, mobile screenshot and three-day PDF are attached to the run for seven days.

## Repairs covered by regression tests

The audit found and corrected integer-overflow validation, permissive date parsing, malformed provider data, unreadable gateway error messages, stale-plan printing and a print-page background issue. The input audit first reproduced 29 failing parameterized cases; those cases now pass. No driving-rule violation was found by the independent schedule audit.

The submission cleanup removes decorative heading/status icons, repeated preparation text, an obsolete reference manifest, a duplicate dependency manifest and the superseded HTTP-only smoke script. Python source uses consistent Ruff formatting. CI checks unused Python imports/variables and TypeScript locals/parameters.

## Limits

The implementation uses the [FMCSA property-carrier rules](https://www.fmcsa.dot.gov/regulations/hours-service/summary-hours-service-regulations) within its documented planning assumptions. It has no prior daily recap history, truck-specific restrictions, facility availability or automatic terminal daylight-saving transitions. Browser coverage uses Chromium and emulated viewports, not physical-device certification.

The candidate must review the implementation, arrange access to the private repository, record the 3–5 minute Loom and submit the required links. Work time is declared by the candidate, not inferred from automated tests.
