# Assessment audit · 14 September 2026

This audit checks the submitted assessment brief, its blank log-sheet image and the supplied FMCSA guide against the implementation. It supplements the historical [verification record](verification.md). The author owns the final source review, Loom recording, reviewer access and submission.

## Verification results

| Gate | Result |
| --- | --- |
| Python backend | 123 tests passed locally and in CI; includes validation, providers, scheduling, daily logs and Vercel WSGI adapters |
| React components | 18 tests passed locally and in CI |
| Independent schedule audit | 1,500 deterministic generated trips plus 21 explicit clock/fuel boundary cases passed |
| Original generated schedule checks | 120 scenarios passed; generated scenarios run inside named tests |
| TypeScript, production build, Django checks | Passed locally and in CI |
| Generated API fixture | Regeneration produces no difference |
| Browser and PDF review | 36 browser cases passed; 16 PDFs / 40 total pages checked; all four viewport renders match |
| Production | READY on Vercel; health 200, four live trips, map stops, log navigation and stale-print protection verified |

**177 named tests passed** in [audit run 34834868575](https://github.com/Hanzala-Shadow/spotter-trip-planner/actions/runs/34834868575), commit `037b81b8b7316742fc1bf03043c03b89f1a9a524`: 123 backend + 18 frontend + 36 browser. All build, Django and fixture-consistency gates passed.

Generated scenarios are not added to the named-test count. Browser tests use the real Django application and React production bundle with declared provider fixtures; live deployment checks separately exercise public providers.

## Requirement coverage

| Employer requirement | Evidence and acceptance condition |
| --- | --- |
| React and Django | Built React app calls the Django JSON API; all three Vercel function adapters are tested |
| Current, pickup and dropoff locations | Explicit search/selection, selected coordinates, ordered two-leg route, keyboard selection and identical locations |
| Current cycle used in hours | Zero, fractional, near-exhausted and 70-hour cases; invalid values rejected |
| Map, route instructions, stops and rests | Leaflet route paths and itinerary-to-popup interaction; directions tab and real routing checks |
| Drawn, filled daily logs | Connected four-status SVG, 15-minute grid, date, mileage, exact status totals, remarks and optional driver/vehicle fields |
| Multiple log sheets | Midnight, leap-day, year-end and multi-day schedules; every sheet covers exactly 24 hours; all dates included when printing from another tab |
| Property carrier, 70 hours/8 days, no adverse conditions | Independent interval-based checks of driving limits, required interruptions, qualifying rest and conservative cycle restart |
| Fuel at least every 1,000 miles | Every cumulative gap checked across both legs, including exact and fractional boundaries around 1,000 and 2,000 miles |
| One hour pickup and dropoff | Exactly one on-duty event of 3,600 seconds each; also checked when all locations are identical |
| UI and UX | Error recovery, loading/stale state, keyboard interactions, dialog focus, long metadata and four responsive screen sizes |
| Hosted app and GitHub source | Existing GitHub-to-Vercel connection; small content batches verified by Git blob hashes |
| 3–5 minute Loom and submission | Author completes after reviewing this audit and the walkthrough outline |
| Four days / at most 16 work hours | Recruiter deadline and author work-time declaration; automated testing cannot certify time spent |

## Defects found and corrected

- Very large JSON integers could raise overflow errors instead of returning a validation response. Bounds are now checked before float finiteness.
- Incomplete or malformed departure strings could be accepted by Python's permissive ISO parser. The API now requires a complete local date and time.
- Malformed upstream search or routing payloads could cause internal errors or invalid map data. The adapters validate envelopes, coordinates and route steps, skip invalid search candidates and return controlled service errors.
- Non-JSON gateway responses exposed raw parsing errors. Search and trip generation now show readable retry messages.
- Changed inputs left the print button usable for an old plan. Printing is disabled until regeneration; direct browser printing includes a stale-plan notice.
- The page root background left a gray area at the bottom of an exported sheet. Print styles now set both the root and body to white.

The input audit initially reproduced 29 failing parameterized cases. Those regressions now pass. No driving-rule violation was found by the independent scheduling audit, so the scheduling algorithm was not changed.

## Browser and print evidence

The suite covers desktop 1440 × 1000, phone 390 × 844, compact phone 320 × 740 and tablet 768 × 1024. It exercises trip generation, map paths and stop popups, explicit location selection, validation, service-error retry, stale printing, all-date navigation, keyboard search, dialog focus, long metadata and zero-distance service across leap-day midnight.

Downloaded artifact `10343209471` from [initial audit run](https://github.com/Hanzala-Shadow/spotter-trip-planner/actions/runs/34834570855), verified its SHA-256 `d3f7ce5dded6b3c9efe055317714016ad738a0ad7b7b9f54f01c2dfdde2b9d04`, and inspected all ten distinct rendered pages. Four scenarios across four viewports produced 16 US Letter PDFs and 40 total pages. Every viewport produced identical page-render hashes for each scenario: four pages for the year-end cycle restart; two each for zero-distance midnight, normal multi-day and maximum-length optional metadata. No missing dates, leading blank pages, clipped text or gray page background remained. Representative screenshots at all four sizes were inspected; the narrow daily graph scrolls horizontally inside the worksheet.

That first browser run passed 32/36 cases. One new selector matched both the expected gateway error and the intentionally unavailable map-tile alert in each viewport. The selector was narrowed to the intended message; this changed only the test, not the rendered application. The rerun passed all 36 cases without retries; its browser artifact is `10342938981`.

## Independent schedule method

The new oracle reconstructs clocks from event status intervals instead of trusting scheduler reset labels or counters. It verifies at each driving interval: no more than 11 driving hours after qualifying rest, driving within the 14-hour window, a qualifying non-driving interruption after eight driving hours, and the 70-hour cycle allowance after a 34-hour restart. It independently intersects events with calendar days to check totals, continuity, dates, mileage, service durations and fuel gaps.

Boundaries include one second before/at/after driving limits, almost-exhausted cycles, zero driving, repeated restarts, long routes, midnight, leap-day and year-end. Generated inputs vary both route durations and speeds, prior cycle usage, start minute and five terminal offsets. The rule reference is the [FMCSA hours-of-service summary](https://www.fmcsa.dot.gov/regulations/hours-service/summary-hours-service-regulations) and the supplied guide, pages 6–11 and 15–17.

## Production and Git verification

Verified production application commit `037b81b8b7316742fc1bf03043c03b89f1a9a524`, deployment `dpl_DGddtVawVVwvVknakywU7vAKNX2b`, at the [public app](https://spotter-trip-planner-indol.vercel.app/). The deployment is READY, the build completed in 26 seconds and `/api/health` returned HTTP 200 with the Django service response. The public homepage loaded the verified `index-DsQRP65l.js` and `index-DQhnz51U.css` build assets. [Main-branch run 34835111999](https://github.com/Hanzala-Shadow/spotter-trip-planner/actions/runs/34835111999) also passed on that exact commit.

Live checks used the real public providers on 14 September 2026, with departure 15 September at 06:00, UTC−06:00. Values below are rounded as displayed by the UI.

| Live route | Prior cycle | Miles | Driving | Total elapsed | Sheets | Result |
| --- | ---: | ---: | --- | --- | ---: | --- |
| Chicago → Springfield → Nashville | 0 h | 561 | 10h 51m | 12h 51m | 1 | Two one-hour service events, no unnecessary stops |
| Los Angeles → Phoenix → Dallas | 20 h | 1,438 | 26h 09m | 48h 39m | 3 | One fuel stop, two daily rests, final log date accessible |
| Chicago → Nashville → Atlanta | 68 h | 715 | 13h 30m | 59h 30m | 3 | Two hours driving, then a 34-hour restart; one later daily rest |
| Chicago → Chicago → Chicago, identical searched coordinates | 0 h | 0 | 0h 00m | 2h 00m | 1 | Pickup and dropoff only, no driving |

The live Leaflet basemap and both route legs rendered. The fuel itinerary button opened its matching popup; Next was disabled on the last log date. Live geocoder selection worked for all three fields. Changed cycle and departure inputs raised the stale notice and disabled printing. Native keyboard editing changed the date/time control; the cloud browser's `fill` operation did not change that native control, so leap-day/midnight UI coverage is attributed to the passing Playwright CI case, not the live trip above. No application-domain console errors or Vercel runtime errors were found in the checked deployment interval.

Published four initial content batches of approximately 12–32 KB, followed by a small test-selector correction. Every uploaded file was compared with its local Git blob hash, and each branch update was read back. Main was advanced without force only after the audit branch passed. Local and remote application commit/tree objects match. This report and README updates are a later documentation-only commit; the application deployed and tested above is unchanged.

## Scope that remains explicit

- This is a planning worksheet. The four requested inputs do not provide eight prior daily duty totals, so rolling recapture is not inferred. A conservative 34-hour restart is used when needed; service work is also kept within the cycle allowance even though the driving prohibition is narrower.
- The driver starts rested with a full tank. Full 10-hour rests are represented as sleeper time; split-sleeper optimization is not implemented. The selected fixed home-terminal offset applies to every date, without automatic daylight-saving changes.
- Public OSRM routes are not truck-restriction-aware. Fuel/rest coordinates and nearby labels are planning estimates, with no parking or fuel-availability verification. Live traffic is not modeled.
- Browser automation covers Chromium desktop and emulated phone/tablet viewports, not physical devices or a Safari/Firefox certification.
- The repository is private. Reviewer access and the required Loom remain delivery tasks; no application submission has been sent.

## Reproduce

Run the commands in [README](../README.md#verify). The `Verify` GitHub Actions workflow installs the locked dependencies, runs all named tests, checks regenerated fixtures and uploads browser screenshots/PDFs under `browser-verification` with seven-day retention.
