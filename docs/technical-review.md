# Loom walkthrough and submission preparation

## Recording example

Use the **Multi-day** preset at [the public application](https://spotter-trip-planner-indol.vercel.app/). It demonstrates the map, both route legs, fuel, rest and multiple daily sheets in one example.

| Input | Value |
| --- | --- |
| Current location | Los Angeles, California |
| Pickup | Phoenix, Arizona |
| Dropoff | Dallas, Texas |
| Current cycle used | 20 hours |
| Departure | 15 September 2026, 06:00 |
| Home-terminal offset | UTC−06:00 |

The preset selects exact coordinates. Typing a city without selecting a result is not equivalent. Set the date explicitly: a fresh page defaults to tomorrow. The selected offset is the fixed terminal time base for the demonstration, not each city's local clock.

For filled metadata, open **Driver & vehicle details** before generating:

| Field | Suggested recording value |
| --- | --- |
| Driver | Hanzala Ahsan |
| Carrier | Demo Carrier |
| Vehicle / trailer | Truck 101 / Trailer 201 |
| Shipping document | DEMO-001 |
| Office / terminal | Demo Terminal |

The automated preflight uses **Demo Driver** in the driver field. Names do not change the schedule. The carrier, vehicle and document values are demonstration data.

## Expected results

The [passing production preflight](https://github.com/Hanzala-Shadow/spotter-trip-planner/actions/runs/34849627063) on 14 September 2026 at 13:30 UTC measured:

| Result | Expected |
| --- | --- |
| Distance | 1,438 mi on the card; 1,438.1 mi with one decimal |
| Driving time | 26h 09m on the card; exact 26:08:53 |
| Total duration | 48h 39m on the card; exact 48:38:53 |
| Delivery completed | 17 September at 06:38; exact 06:38:53 |
| Fuel stops | 1 |
| Daily rests | 2, each 10 hours |
| Cycle restarts | 0 |
| Daily logs | 15, 16 and 17 September |
| Cycle remaining at finish | 21.4 hours |

Times below use the selected terminal offset. The interface shows event times to the minute.

| Event | Start | Finish | Why it appears |
| --- | --- | --- | --- |
| Drive to Phoenix | Sep 15, 06:00 | 12:46 | First route leg |
| Pickup | Sep 15, 12:46 | 13:46 | Required one-hour service |
| Continue toward Dallas | Sep 15, 13:46 | 18:00 | Reaches 11 total driving hours |
| First daily rest | Sep 15, 18:00 | Sep 16, 04:00 | Ten-hour qualifying rest |
| Continue driving | Sep 16, 04:00 | 11:10 | Reaches about 999.99 cumulative miles |
| Fuel | Sep 16, 11:10 | 11:40 | Thirty minutes before the 1,000-mile limit |
| Continue driving | Sep 16, 11:40 | 15:30 | Reaches the next 11-hour driving limit |
| Second daily rest | Sep 16, 15:30 | Sep 17, 01:30 | Ten-hour qualifying rest |
| Reach Dallas | Sep 17, 01:30 | 05:38 | Remaining route distance |
| Dropoff | Sep 17, 05:38 | 06:38 | Required one-hour delivery service |

Approximate daily mileage is 605.0, 605.0 and 228.1 miles.

| Log date | Off duty | Sleeper berth | Driving | On duty, not driving | Total |
| --- | --- | --- | --- | --- | --- |
| Sep 15 | 6:00 | 6:00 | 11:00 | 1:00 | 24:00 |
| Sep 16 | 0:00 | 12:30 | 11:00 | 0:30 | 24:00 |
| Sep 17 | 17:21:07 | 1:30 | 4:08:53 | 1:00 | 24:00 |

The 12:30 sleeper total on Sep 16 contains the end of the first rest and the start of the second. A daily log is a calendar view; it is not a new driving shift. Time before departure and after completion is explicitly marked as assumed off duty.

These are measured provider results, not hard-coded answers. Minor route distances, estimates or nearby labels may change; the scheduling rules and one-hour service requirements still apply.

## A 4 minute 45 second walkthrough

Use this as speaking notes. Rehearse the actions once and explain them in your own words.

| Time | Show | Explain |
| --- | --- | --- |
| 0:00–0:20 | Public app | Purpose and stack |
| 0:20–0:45 | Multi-day preset and input fields | Required inputs, departure and terminal clock |
| 0:45–1:15 | Generate and summary cards | Driving versus total elapsed time |
| 1:15–1:55 | Route, fuel popup and itinerary | Two route legs, fuel and overnight rests |
| 1:55–2:40 | Daily logs and date navigation | Four statuses, midnight splitting, 24-hour totals and remarks |
| 2:40–2:55 | Print preview | All three dates appear, including unselected dates |
| 2:55–3:25 | Cycle restart preset | Two hours available, then a 34-hour restart |
| 3:25–4:20 | Django view and scheduling loop | Request flow, limiting clocks and shared event list |
| 4:20–4:45 | Passing CI and brief limitations | Test evidence and scope |

### 0:00–0:45: purpose and inputs

“Hi, I’m Hanzala. This is Waypoint, my React and Django implementation of the truck trip-planning assessment. It takes the current location, pickup, dropoff and used cycle hours, then produces a route, scheduled stops and filled daily logs.

“I’ll use Los Angeles to Dallas through Phoenix, starting with 20 cycle hours used. I’ve also supplied the departure time and a fixed terminal offset so every log has a consistent date and clock.”

Point to the fields. Do not spend time typing every optional detail during the recording.

### 0:45–1:55: generation, map and stops

Click **Generate trip plan**.

“The route is about 1,438 miles. Driving takes about 26 hours, while the complete trip takes about 48 hours because that includes pickup, delivery, fuel and rest.

“The map separates the route to pickup from the route to dropoff. Stops are linked to the itinerary: selecting this fuel stop opens its map marker. Fuel is scheduled just before 1,000 cumulative miles, including miles driven before pickup. Each pickup and dropoff takes one hour. After 11 driving hours, the schedule inserts a ten-hour rest.”

Click the fuel row, then use **Fit route** so the reviewer can see its popup. Briefly open Directions if time allows. Do not read turn-by-turn instructions or every timestamp.

### 1:55–2:55: daily logs and printing

Open **Daily logs (3)** and move through the three dates.

“The same schedule fills one record for each terminal calendar date. The graph shows off duty, sleeper berth, driving and on-duty work. These totals add to exactly 24 hours. Remarks identify each activity and its location.

“Rest can cross midnight, so the daily record splits it across sheets. Midnight itself does not reset the driving allowance. The unused time before and after the trip is labelled as assumed off duty.”

Open **Print logs**, show the three-page preview briefly, then cancel.

“Printing includes every daily sheet, even when a different date is selected.”

### 2:55–3:25: cycle limit

Choose **Cycle restart**, keep the same departure, and generate.

“This preset starts with 68 of the 70 cycle hours already used. The driver can drive for two hours, from six to eight, then the planner inserts a 34-hour restart. The restart ends at six in the evening the following day.

“The input provides a total for prior cycle usage, not eight daily records. Without that history, the planner uses a conservative restart instead of inventing available recap hours.”

Expected secondary result: Chicago → Nashville → Atlanta, about 715 miles, 13h 30m driving, 59h 30m elapsed, one cycle restart, one later daily rest and three logs.

### 3:25–4:20: code

Open these files in advance:

1. `backend/planner/views.py`: the `plan` view.
2. `backend/planner/schedule.py`: the `while elapsed < leg.seconds` loop and `seconds = min(...)`.
3. `backend/planner/schedule.py`: `daily_logs`.
4. Optionally `frontend/src/LogSheet.tsx`: graph coordinates and polyline.

“Django validates the request, gets the ordered road legs, calculates the schedule and returns the results to React. The scheduling function is separate from network calls, so it can be tested with known routes.

“For each driving segment, it takes the smallest remaining allowance: route time, daily driving, the break threshold, the cycle, the shift window or distance until fuel. It adds that event, updates the clocks and checks again. All clocks use integer seconds.

“The itinerary and daily logs come from the same event list. The daily-log function intersects events with calendar dates, and React draws the resulting segments.”

Do not read the entire function or explain imports, every component, CSS classes or framework boilerplate.

### 4:20–4:45: verification and scope

Show the latest successful **Verify** run.

“The suite passes 177 tests, including browser checks at four screen sizes. The scheduling tests also exercise 1,620 generated trips, with independent checks of the clocks and daily totals. I ran the live demonstration separately against the deployed application.

“The main remaining production integrations would be truck-specific routing, verified parking and fuel facilities, and actual driver recap history. The app and source links are included with my submission.”

Use the [passing main-branch run](https://github.com/Hanzala-Shadow/spotter-trip-planner/actions/runs/34849085988) as the test evidence. Open the latest `main` revision for the code walkthrough.

## What deserves detail, and what to skim

| Explain clearly | Keep brief |
| --- | --- |
| Required inputs and what “cycle used” means | Optional fields and visual styling |
| Driving time versus complete trip duration | Every route instruction and event timestamp |
| Why fuel and rest occur where they do | Library choices and package versions |
| Calendar logs versus rest-based driving clocks | CSS, imports and Vercel wrapper boilerplate |
| How the scheduler selects the next limit | Every test case and the complete test output |
| Missing recap history and the restart policy | Long discussion of future features |

If running late, skip optional code files, directions and detailed provider internals. Keep the main example, logs, cycle edge case and core scheduling explanation.

## Before recording

1. Open the public app, the three code locations and the latest successful CI run. Use readable browser/editor zoom and close unrelated tabs or notifications.
2. Generate Multi-day and Cycle restart once to confirm the live providers are responding. Recheck the departure date and terminal offset.
3. Return to Multi-day and fill the optional demo details before recording. Recording the actual generation is preferable to presenting a screenshot.
4. Test **Print logs** once. Use Letter, portrait and default scaling; know how to cancel the dialog quickly.
5. Aim for roughly 4:30–4:45, leaving room for a brief network wait. Do not run the full test suite during the recording; show the completed result.
6. Play back the video once to check audio, readable code and a duration within 3–5 minutes. Check the video link's reviewer access.

## Submission text

The recruiter requested the GitHub, hosted application and Loom links through the questionnaire in the email.

```text
Hi Ena,

I have completed the Full Stack Developer assessment.

GitHub: https://github.com/Hanzala-Shadow/spotter-trip-planner
Hosted application: https://spotter-trip-planner-indol.vercel.app/
Loom walkthrough: [paste the completed video link]

The application uses React and Django to generate the route, planned fuel and rest stops, and daily duty logs. The test suite and live deployment checks are passing.

Best regards,
Hanzala Ahsan
```

Replace the Loom placeholder before submission. Ensure the private repository can be opened by the reviewer; public access or an invitation must be arranged by the candidate. The questionnaire's personal link belongs in the email, not in this repository.
