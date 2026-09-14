# Loom walkthrough and submission preparation

## Set up Loom for your first recording

Use the Chrome extension and keep the app, GitHub code and test results in one Chrome window. If you prefer a local editor and want the camera bubble to follow you between applications, use the desktop app on Windows or macOS. Loom's desktop app does not support Linux; on Ubuntu, use the Chrome extension. [Recording platforms](https://support.atlassian.com/loom/docs/the-loom-recording-platforms/)

1. Open [Loom](https://www.loom.com/) and sign up or sign in. The Starter plan permits five minutes per recording, which covers the required 3–5 minute assessment video. Aim to stop around 4:30–4:45. [Recording limits](https://support.atlassian.com/loom/docs/how-long-can-i-record/)
2. Follow [Install the Chrome Extension](https://support.atlassian.com/loom/docs/install-the-chrome-extension/). Add it from the official store, allow microphone access and camera access if using a webcam, then pin Loom using Chrome's Extensions menu.
3. Prepare the tabs below. Maximize Chrome, close unrelated tabs, silence notifications and keep these notes on your phone or on paper. Increase code zoom until it is readable in a short playback test. A small camera bubble is optional; place it where it does not cover the fields, map or log totals.
4. Open the Loom extension. Select **Full Screen** and turn the **microphone on**. Choose your actual microphone and confirm the audio indicator responds as you speak. Set the camera on or off as preferred. Use the highest recording quality offered by your account; keep system/tab audio off for this narrated demonstration. [Recorder controls](https://support.atlassian.com/loom/docs/get-started-with-the-loom-chrome-extension/)
5. Select **Start Recording**. In Chrome's sharing dialog choose the screen containing the prepared window and select **Share**. Full-screen capture keeps tab changes, a local editor and print preview in the recording. If sharing one tab, switching tabs will not automatically change the captured source.
6. First make a disposable 20–30 second test. Say a sentence, switch to the code tab, open and cancel print preview, then use Loom's **Stop** button. Play it back to check your microphone, text size and captured screen. The extension camera bubble can disappear over PDFs or other applications; that does not mean screen capture stopped.
7. Rehearse the script below with the actual clicks. Generate both presets once, then return to Multi-day, set the exact date/offset and fill optional details. For the final take, speak naturally and allow results to load before describing them. Leave the timer/control menu available until you are comfortable stopping.
8. Stop before five minutes. Wait until the video page has loaded and the whole recording plays. Rename it **Hanzala Ahsan | Spotter Assessment | React + Django Trip Planner**. Review the audio, code readability and total duration. Use **Share → Link settings → Anyone with the link**, then **Copy link**, and test the link in a signed-out or incognito window. [Sharing options](https://support.atlassian.com/loom/docs/share-your-recording/)

### Tabs to open before starting

| Tab | Open at |
| --- | --- |
| [Application](https://spotter-trip-planner-indol.vercel.app/) | Multi-day inputs, before generating |
| [Django view](https://github.com/Hanzala-Shadow/spotter-trip-planner/blob/main/backend/planner/views.py) | Search within the file for `def plan` |
| [Scheduler](https://github.com/Hanzala-Shadow/spotter-trip-planner/blob/main/backend/planner/schedule.py) | `while elapsed < leg.seconds` and `seconds = min(` |
| [Daily logs](https://github.com/Hanzala-Shadow/spotter-trip-planner/blob/main/backend/planner/schedule.py) | A second tab at `def daily_logs` |
| [Passing verification](https://github.com/Hanzala-Shadow/spotter-trip-planner/actions/runs/34849085988) | Completed Verify run |
| [Live preflight](https://github.com/Hanzala-Shadow/spotter-trip-planner/actions/runs/34849627063) | Optional evidence tab |

Keep the repository signed in on your recording computer. Use the latest `main`; do not show an older local checkout.

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

## Complete walkthrough script

Target: **4:30–4:45**, within the required 3–5 minutes. The spoken text is about 480 words. Read only the quoted paragraphs; the action notes tell you what to show. Timings are rehearsal targets, not a requirement to rush. At a slower pace, omit optional directions and keep the code explanation concise.

### 0:00–0:20: Introduction

**Show:** Show the application with the Multi-day preset selected and the required inputs visible.

> Hi, I’m Hanzala Ahsan. This is Waypoint, my React and Django implementation of the truck trip-planning assessment. It takes the current location, pickup, dropoff and used cycle hours, then produces a route, scheduled stops and daily duty logs.

### 0:20–0:45: Inputs

**Show:** Point to the three locations, 20 cycle hours, September 15 at 06:00 and UTC−06:00. Optional driver details should already be filled.

> For this example, the driver starts in Los Angeles, picks up in Phoenix and delivers in Dallas, with twenty cycle hours already used. I’ve set departure to September fifteenth at six in the morning. Every sheet uses the selected home-terminal offset, so the clock stays consistent across the route.

### 0:45–1:15: Generate and summarize

**Show:** Click Generate trip plan. Let the result load before reading its numbers. Point to distance, driving time and total duration.

> I’ll generate the plan now. The route is about fourteen hundred and thirty-eight miles. Driving takes twenty-six hours and nine minutes, while the complete trip takes forty-eight hours and thirty-nine minutes. That difference includes pickup, delivery, fuel and rest. Delivery finishes on September seventeenth at approximately six thirty-eight in the morning.

### 1:15–1:55: Map and stops

**Show:** Show the two route legs. Click the fuel event to open its marker, then briefly point to the daily rest events. Use Fit route when needed.

> The map separates the leg to pickup from the leg to delivery. Selecting a stop in the itinerary opens its map marker. This fuel stop occurs just before one thousand cumulative miles, including the miles before pickup. Pickup and dropoff each take one hour. The driver reaches eleven driving hours before each of these ten-hour rests.

### 1:55–2:40: Daily logs

**Show:** Open Daily logs (3), point to the graph and totals, and move through all three dates.

> The same schedule fills one log for each terminal calendar date. The graph shows off duty, sleeper berth, driving and on-duty work, with totals that add to exactly twenty-four hours. Remarks identify the activities and locations. Rest can cross midnight, so it appears across two sheets. Midnight itself does not reset the driving allowance. Time before departure and after completion is clearly labelled as assumed off duty.

### 2:40–2:55: Print

**Show:** Click Print logs, briefly show that the preview contains three pages, then cancel.

> Printing includes every daily sheet, even when only one date is selected on screen.

### 2:55–3:25: Cycle limit

**Show:** Select Cycle restart, confirm the same departure, and generate. Point to the first two events.

> This second example starts with sixty-eight of seventy cycle hours already used. The driver can drive for two hours, then the planner inserts a thirty-four-hour restart. The input gives total cycle usage, without the previous eight daily records. Without that history, the planner uses a conservative restart instead of inventing available recap hours.

### 3:25–4:20: Code

**Show:** Show the plan view in views.py, then the scheduling loop and daily_logs in schedule.py. Have each location open in advance.

> Django validates the request, gets the road route, calculates the schedule and returns the result to React. Scheduling is separate from network calls, which makes it straightforward to test with known routes. For each driving segment, the scheduler takes the smallest remaining allowance: route time, daily driving, the eight-hour break threshold, the fourteen-hour shift window, cycle hours or distance until fuel. It adds an event, updates the clocks and checks again, using integer seconds. The itinerary and daily logs share that event list. The daily-log function splits events across calendar dates, and React draws the resulting segments.

### 4:20–4:45: Verification and close

**Show:** Show the successful Verify run. Finish on the application if time allows.

> The suite passes one hundred and seventy-seven tests, including browser checks at four screen sizes and sixteen hundred and twenty generated scheduling cases. The live deployment was also checked separately. For production, I would add truck-specific routing, verified stopping facilities and actual driver recap history. The source, hosted app and this walkthrough are included with my submission. Thank you.

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
