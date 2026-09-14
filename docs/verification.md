# Verification record

## Original phase record (before GitHub publication)

| Phase                      | Delivered                                                                                       | Evidence                                                                      | Remaining gate                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| 1 · Foundation             | Local Git repository, Django, React/MUI/Vite, references and requirement map                    | Django health endpoint, frontend build and same-origin HTTP proxy verified    | Remote GitHub repository creation                   |
| 2 · Engine/API             | Road provider, deterministic duty scheduling, logs, validation and errors                       | 48 original backend tests passed, including 120 generated scenarios           | None for the implemented offline core               |
| 3 · Workflow               | Trip form, Leaflet map, itinerary, directions, SVG logs, print layout and optional stop names   | 51 backend tests and 15 frontend tests passed; production bundle built        | Phone-sized viewport and exported PDF QA            |
| 4 · Deployment preparation | Vercel function adapters, runtime/build configuration, CI, live smoke check and technical notes | 56 backend tests plus 15 frontend tests passed; all three WSGI exports tested | Phone-sized viewport, exported PDF and GitHub gates |

**71 automated test cases pass.** The 120 generated scheduler scenarios run inside one of those backend test cases; they are not an additional 120 named tests.

## What the automated checks cover

- Driving ≤11 hours after qualifying rest; no driving outside the 14-hour window.
- A non-driving interruption after eight cumulative driving hours.
- Current cycle usage, near-exhausted cycle, 34-hour restart and no redundant daily rest before restart.
- Fuel gaps ≤1,000 miles across the pickup boundary, fractional hours and exact-mileage conservation.
- One hour each of pickup/dropoff, zero-distance legs, continuous events, midnight crossings and 24-hour sheet totals.
- Input validation, provider failures, geocoder filtering, geometry validation and speed estimate cap.
- Approximate city/state enrichment and coordinate fallback without changing the schedule.
- Actual Vercel WSGI adapter dispatch for health, location search, JSON plan POST and errors.
- Form-to-Django request contract, selected coordinates, stale search response rejection, missing selection, invalid hours, error recovery, directions, modal interaction, daily log navigation and inclusion of all print sheets.

The frontend fixture is generated through the Django view with declared route fixtures. Leaflet rendering is isolated from component tests; the hosted browser check below verified actual map tiles, geometry and popups.

## Live HTTP checks

The production frontend and actual Django application were run on one local HTTP origin using `scripts/serve_preview.py`. `scripts/live_smoke.py` served the built homepage, called the health endpoint and posted three requests using real public OSRM/Photon providers.

Fixed departure: 15 September 2026, 06:00 at UTC−06:00. Distances and route estimates may change with provider data.

| Request                                    | Road miles | Driving  | Daily sheets | Fuel | Daily rests | Cycle restarts |
| ------------------------------------------ | ---------: | -------- | -----------: | ---: | ----------: | -------------: |
| Chicago → Springfield → Nashville, cycle 0 |      561.3 | 10:51:08 |            1 |    0 |           0 |              0 |
| Same route, cycle 68                       |      561.3 | 10:51:08 |            3 |    0 |           0 |              1 |
| Los Angeles → Phoenix → Dallas, cycle 20   |    1,438.1 | 26:08:53 |            3 |    1 |           2 |              0 |

All three passed. Each response had two route legs, conserved daily totals and the expected stop types. Response sizes were approximately 210–359 KB. Some optional reverse lookups returned city/state; others retained coordinate labels as designed.

These checks prove HTTP/API integration with live routing. They do not prove map tiles render, browser layout is correct, or Vercel's deployed packaging works.

## Hosted verification · 14 September 2026

Public URL: [https://spotter-trip-planner-indol.vercel.app/](https://spotter-trip-planner-indol.vercel.app/)

- Deployment `dpl_6r1VYFq9yi9mqmci5qv7io89GyDm` is READY. Build completed in 26 seconds; three Python 3.12 functions were bundled.
- The public homepage and `/api/health` returned HTTP 200 without authentication. The team preview address is protected; use the public URL above for the assessment.
- Real browser generation passed for all three UI presets: Chicago → Springfield → Nashville; Los Angeles → Phoenix → Dallas; and Chicago → Nashville → Atlanta with cycle 68.
- The desktop screenshot shows loaded OpenStreetMap tiles, both road legs, route markers and the itinerary. Clicking Pickup opened the corresponding map popup. Directions rendered actual road instructions.
- The long-trip preset showed 1,438 miles, one fuel stop, two daily rests and three log dates. Navigation reached the final date and disabled Next. All three print sheets were present in the DOM. Four-status graph rendering and on-screen remarks were visually inspected.
- Cycle 68 produced two hours driving followed by a 34-hour restart; the remaining schedule included its required daily rest.
- Hours 71 displayed a validation error. Edited inputs displayed the stale-result notice. Live Denver search returned city/state candidates, and selection updated the field.
- No application errors appeared in the browser log filtered to the app's domain; Vercel's runtime error scan also returned no errors. Extension/sign-in-page messages were not counted as application failures.
- Upload contained only 30 application/build files (about 231 KB of text); no supplied reference files were sent.

## Remaining delivery steps

- The existing Vercel project has no Git repository link. Its direct production deployment is healthy; GitHub pushes do not automatically redeploy it.
- The repository remains private. Reviewer access must be arranged before sharing the source link as a final submission.
- The author still needs to review the architecture and record the required 3–5 minute Loom. Assessment submission has not been sent.
- The mobile check used Chromium at 390 × 844, not a physical phone. PDF review covered the two-day route fixture used by the browser suite.

## Recovery verification — 14 September 2026

- Recovered source from the saved review package and compared it with GitHub: the remote initially contained only `.gitignore`.
- Reran the locked dependency installation, 56 backend tests, 15 frontend tests, TypeScript/Vite production build, Django system check and generated-fixture consistency check. All passed.
- Vercel deployment `dpl_6r1VYFq9yi9mqmci5qv7io89GyDm` remains READY. The Django health endpoint returned HTTP 200. The Vercel project has no Git link.
- Repeated the live Los Angeles → Phoenix → Dallas trip: 1,438 miles, one fuel stop, two daily rests and three log sheets. The itinerary fuel button opened the matching Leaflet popup.
- Source uploads exclude the original PDF, PNG and DOCX reference attachments; those bytes are retained in the review package. All runtime source, tests, dependency locks, configuration and technical documentation are included.

## GitHub Actions and visual verification

[Successful run 34831240229](https://github.com/Hanzala-Shadow/spotter-trip-planner/actions/runs/34831240229) tested source commit `77288c78d8b0f6de3f698a5728a50bfe25f19302`.

- **77 named tests passed:** 56 backend, 15 frontend and six browser cases. The 120 generated scheduler scenarios remain part of the backend suite, not 120 extra named tests.
- TypeScript checking, Vite build, Django system check and regenerated-fixture consistency passed in CI.
- Browser cases passed at 1440 × 1000 desktop and 390 × 844 mobile: trip generation, Leaflet stop popup, log-day navigation, print-sheet inclusion, selected-location submission, input validation, API-error recovery and stale-result notice. The overflow assertion passed on both viewports.
- Inspected both browser screenshots. The narrow layout stacks the form and results; the daily worksheet stays within the page. CI deliberately blocks public map tiles and uses declared road fixtures, so its map-unavailable notice is expected. The live production check separately exercised real routing and the fuel popup.
- Downloaded the `browser-verification` artifact and checked its SHA-256 against GitHub's recorded digest. Both PDFs have exactly two US Letter pages. Rendered every page and inspected the graphs, totals, remarks and footer: no missing sheets, blank leading page or clipped content. Desktop and mobile PDF page renders have identical hashes.
- Rebuilt frontend files match every asset in the archived deployed build byte for byte. The live homepage references the same application JS and CSS asset names.
- A Vercel runtime error query covering the last hour returned no errors.
- All 62 remote source files matched the local blob hashes after nine sequential upload batches. The original remote initialization commit was retained. The original five phase commits are preserved separately in the review bundle and local `recovered-phase-history` branch.

The later verification-record commit changes documentation only; it does not change the application or test code validated by this run.
