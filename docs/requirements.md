# Assessment requirements and verification

Source: Spotter AI Full Stack Developer assessment, received 13 September 2026 UTC. Original files are preserved in `spotter-trip-planner-review.zip`; `docs/references/README.md` lists them. The recruiter email and personal submission URL are deliberately excluded from the repository.

## Required behavior

| ID  | Requirement                                               | Implementation                            | Verification                             |
| --- | --------------------------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| R01 | Django and React                                          | backend and frontend                      | Health API and browser connection        |
| R02 | Current, pickup and dropoff locations                     | Trip form and route provider              | Ordered two-leg route tests              |
| R03 | Current cycle used in hours                               | Validated cycle input                     | 0, fractional, 69, 70 and invalid values |
| R04 | Route instructions and map                                | Route geometry, directions and stops      | Provider and UI checks                   |
| R05 | Stops and rests on map                                    | Scheduling events with coordinates        | Map/itinerary consistency                |
| R06 | Draw and fill daily logs                                  | Four-row SVG graph, remarks and totals    | Midnight split and 24-hour totals        |
| R07 | Multiple logs for longer trips                            | One sheet per home-terminal calendar date | Multi-day trip tests                     |
| R08 | Property driver, 70 hours / 8 days, no adverse conditions | Documented scheduling policy              | Rule boundary tests                      |
| R09 | Fuel at least every 1,000 miles                           | Cumulative distance across both legs      | Fuel-gap boundary tests                  |
| R10 | One hour for pickup and dropoff                           | 60 minutes at each location               | Exactly two service events               |
| R11 | Good UI, UX and aesthetics                                | Responsive dispatch workspace             | Desktop/mobile browser review            |
| R12 | Hosted version and GitHub code                            | Vercel configuration and Git repository   | Public deployment and source checks      |
| R13 | 3–5 minute Loom showing app and code                      | Walkthrough outline                       | User records final video                 |
| R14 | At most four days and 16 work hours                       | Bounded phases                            | Development log                          |

## Reference guide

- `new-full-stack-dev-assessment.docx`: authoritative brief.
- `fmsca-image.png`: highlights the relevant guide sections, including sleeper berth, cycle restart, graphs and remarks.
- `blank-paper-log.png`: expected four-row daily log layout.
- `fmcsa-hos-395-drivers-guide-to-hos-2022-04-28-0-1-.pdf`: definitions and examples, especially pages 5–11 and 14–19.
- Video: https://www.youtube.com/watch?v=whxe41XYXS8 — Schneider, “How to fill out a log book for truck drivers: Complete guide and walkthrough.” Reviewed transcript: 24-hour grid, 15-minute ticks, four statuses, connected lines, city/state remarks, daily miles and totals. The video illustrates presentation; the written FMCSA rules govern scheduling.
- Current official summary: https://www.fmcsa.dot.gov/regulations/hours-service/summary-hours-service-regulations

## Explicit assessment assumptions

- A single driver starts after at least 10 consecutive hours off duty. Current cycle used is prior on-duty work, not current-shift driving.
- Use one home-terminal time zone across the route. Departure date/time is an additional input needed to produce dated sheets.
- Start with a full tank; schedule 30-minute on-duty fuel stops before exceeding 1,000 cumulative miles.
- Pickup and dropoff each take one hour, logged on duty, not driving.
- Use full 10-hour rest periods; do not optimize split-sleeper pairings.
- The four required inputs cannot reconstruct the previous eight daily totals. Do not invent rolling recapture; use an explicitly disclosed conservative 34-hour restart when necessary.
- Use road-routing estimates and cap average planned road speed at 55 mph. Routing is not certified for truck height, weight or hazardous-material restrictions.
- Stop locations interpolated along a road route are planning points, not verified available parking or fuel facilities.
- Driver/carrier/vehicle and shipping fields are optional, marked “Not provided” when unknown. Never invent a signature.
- Fill the unused portions of the first/last log date as assumed off duty, clearly explained in remarks.
