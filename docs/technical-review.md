# Author review and assessment preparation

## Review in this order

1. Read `docs/requirements.md` alongside the supplied brief, blank log and highlighted FMCSA sections. Notice which assumptions were required and which fill missing input data.
2. Trace one POST from `App.tsx` through validation, route fetching, scheduling and log rendering. Explain why the browser does not independently calculate legal hours.
3. Walk through `schedule.py` with the “Day trip” sample. Then use cycle 68 and explain why a 34-hour restart appears.
4. Read the generated-scenario test's independent rule checker. Explain what an invariant checks beyond one expected output snapshot.
5. Review fixed terminal offset, rounding, fueling across the pickup boundary and midnight splitting.
6. Inspect provider failure handling and the disclosure that a proposed stop is not verified legal parking.
7. Run the tests yourself, change one boundary temporarily to understand a failure, then revert that experiment.

## Questions to prepare for

| Question                                    | Points to explain in your own words                                                                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Why no LLM?                                 | Routing and duty limits require deterministic outputs. AI helped implement/review; it is not a runtime dependency.                                                    |
| Why Django with no database?                | The task is a stateless calculation. Django supplies request handling, validation integration and deployment entry points.                                            |
| How does the scheduler choose a stop?       | Advance only as far as the earliest remaining legal or fuel constraint. Reevaluate after every event.                                                                 |
| Why doesn't midnight reset driving?         | Daily duty logs are calendar projections; the legal driving clocks reset after qualifying rest.                                                                       |
| Can pickup satisfy a driving break?         | Yes: its hour on duty is a consecutive non-driving interruption. It consumes cycle and shift time.                                                                    |
| Why a 34-hour restart instead of recapture? | Current cycle used alone cannot reveal which hours expire each day. Previous daily history is missing.                                                                |
| What if the route crosses a time zone?      | All sheets retain the selected fixed home-terminal offset. Display timezone and calculation timezone agree.                                                           |
| Are stops actual truck stops?               | No. Coordinates are interpolated along road geometry, with optional nearby city/state. Facility selection is a future integration.                                    |
| How are miles split at midnight?            | In proportion to that driving event's duration on each side of midnight; daily miles sum to trip miles.                                                               |
| What fails safely?                          | Bad inputs return 400, bad methods 405, wrong media type 415, oversized requests 413, provider failures 503. Optional labels can fail without losing the route.       |
| What would production need?                 | Truck-aware routing, verified facilities, real driving/recap history, IANA terminal zones/DST, persistent trips if required, shared cache/rate limits and monitoring. |
| How does Vercel run Django?                 | Static React assets plus Python WSGI function exports on the same domain. No separate database or LLM service.                                                        |

## Loom outline · about 4 minutes

**0:00–0:35 · Purpose and inputs.** State the task, show current/pickup/dropoff and cycle used. Mention the added departure/time-base input needed for dated logs. Generate the short sample.

**0:35–1:20 · Route and itinerary.** Show the two route legs and map/itinerary linkage. Explain that elapsed trip time includes pickup, delivery and rest, while driving time does not.

**1:20–2:00 · Long trip and logs.** Generate the multi-day sample. Show fuel/rest stops, change log dates and explain the four duty rows, exact 24-hour totals and remarks. Open print preview if the final browser check has passed.

**2:00–2:35 · Cycle limit.** Use the cycle-restart preset. Explain the missing historical recap input and the conservative restart decision.

**2:35–3:30 · Code.** Show the Django view, the pure scheduling loop and one independent rule test. Point out that all output views derive from the same event list.

**3:30–4:10 · Verification and limitations.** Run/show actual passing checks. Briefly explain generic road routing, proposed stop locations and fixed terminal offset. State what you would extend for production. Acknowledge AI coding assistance accurately.

Do not claim a hosted or browser check passed before it has. Record only after you can explain the scheduling state transitions without reading a prepared answer.
