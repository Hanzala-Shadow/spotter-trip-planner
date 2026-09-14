# Waypoint

A React and Django truck trip planner. Enter the current location, pickup, dropoff and used cycle hours to generate a road route, scheduled stops and daily duty logs.

[Live application](https://spotter-trip-planner-indol.vercel.app/) · [Verification](docs/verification.md) · [Architecture](docs/architecture.md) · [Requirements](docs/requirements.md)

## Run locally

Use Python 3.12 and Node.js 22.

```bash
git clone https://github.com/Hanzala-Shadow/spotter-trip-planner.git
cd spotter-trip-planner
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-lock.txt
npm ci
npm run build
python scripts/serve_preview.py
```

Open http://127.0.0.1:8000. The preview serves the production frontend and Django API together.

For development, run Django and Vite in separate terminals:

```bash
.venv/bin/python backend/manage.py runserver 127.0.0.1:8000
npm run dev
```

Open http://127.0.0.1:5173. Vite forwards API requests to Django.

## Verify

```bash
ruff check backend api scripts
ruff format --check backend api scripts
python -m pytest -q
npm test
npm run build
python backend/manage.py check
npx playwright install chromium
npm run test:e2e
```

Activate the virtual environment first. The suite contains 123 backend, 18 component and 36 browser cases. Two backend tests also run 1,620 generated scheduling scenarios. External providers are isolated in these tests.

To check the public deployment with real routing, maps and printable logs:

```bash
npm run demo:preflight
```

This opt-in check writes its report, screenshots and PDF to `test-results/demo-preflight/`. It can also be run through the **Demo preflight** GitHub Actions workflow. See [the recording guide](docs/technical-review.md) for inputs, expected results and the walkthrough order.

## Implementation

| Area | Entry point |
| --- | --- |
| Form, requests and result tabs | `frontend/src/App.tsx` |
| Location search and selection | `frontend/src/LocationField.tsx` |
| Route geometry and stop markers | `frontend/src/MapPanel.tsx` |
| Daily graphs and print sheets | `frontend/src/LogSheet.tsx` |
| Request validation and responses | `backend/planner/views.py`, `validation.py` |
| Driving, service, fuel and rest events | `backend/planner/schedule.py` |
| Photon and OSRM adapters | `backend/planner/providers.py` |
| Deployment | `api/*.py`, `vercel.json` |

The backend produces the event list used by the itinerary, map, summary and logs. Scheduling uses integer seconds. Every daily sheet totals 24 hours, and each event retains its location and reason.

## Planning assumptions

- Property-carrying driver on the 70-hour/8-day cycle, with no adverse conditions.
- Driver starts rested, with a full tank. Pickup and dropoff take one hour each; fuel stops take 30 minutes.
- Full 10-hour rests are used. The four required inputs do not include eight prior daily totals, so the planner uses a conservative 34-hour restart instead of estimating rolling recapture.
- All sheets use the selected fixed home-terminal UTC offset. Automatic daylight-saving transitions are outside the current scope.
- OSRM supplies general road routes. Truck restrictions, parking and fuel availability are not verified. Roadside stop coordinates and nearby city/state labels are planning estimates.
- Optional driver, carrier and vehicle details are entered by the user. No signature or trip history is invented. Boundary-date time outside the planned trip is labelled assumed off duty.

The application is stateless and requires no database, paid map key or user account. Public Photon, OSRM and OpenStreetMap services are suitable for limited demonstration use; sustained traffic needs appropriate providers and rate controls.

[Deployment instructions](docs/deployment.md) · [Technical review and Loom guide](docs/technical-review.md)

## References

- [FMCSA hours-of-service summary](https://www.fmcsa.dot.gov/regulations/hours-service/summary-hours-service-regulations)
- [Supplied log-book walkthrough](https://www.youtube.com/watch?v=whxe41XYXS8)
- [OSRM API](https://project-osrm.org/docs/v5.24.0/api/)
- [Photon](https://github.com/komoot/photon)
- [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/)
