from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
import json
from django.core.exceptions import RequestDataTooBig
from . import providers
from .validation import validate_trip
from .schedule import make_schedule, daily_logs


@require_GET
def health(request):
    return JsonResponse(
        {"status": "ok", "service": "trip-planner", "backend": "Django"}
    )


@require_GET
def locations(request):
    query = request.GET.get("q", "").strip()
    if not 2 <= len(query) <= 150:
        return JsonResponse(
            {"error": "Enter a location between 2 and 150 characters."}, status=400
        )
    try:
        return JsonResponse({"places": providers.search_places(query)})
    except providers.ProviderError as exc:
        return JsonResponse({"error": str(exc)}, status=503)


@require_POST
def plan(request):
    if request.content_type != "application/json":
        return JsonResponse(
            {"error": "Use application/json for trip details."}, status=415
        )
    try:
        places, departure, cycle, details = validate_trip(json.loads(request.body))
        legs = providers.fetch_route(places)
        result = make_schedule(legs, departure, cycle)
        providers.enrich_stop_labels(result["events"])
        result["logs"] = daily_logs(result["events"], departure)
        result["route"] = {
            "legs": [
                {
                    "start": leg.start.json(),
                    "end": leg.end.json(),
                    "miles": leg.miles,
                    "seconds": leg.seconds,
                    "coordinates": leg.coordinates,
                    "directions": leg.directions,
                }
                for leg in legs
            ],
            "provider": "OSRM / OpenStreetMap",
            "truck_restrictions_checked": False,
        }
        result["driver_details"] = details
        result["utc_offset_minutes"] = int(departure.utcoffset().total_seconds() / 60)
        result["assumptions"] = [
            "Property-carrying driver: 70 hours in 8 days, no adverse conditions; 11-hour driving limit and 14-hour window.",
            "A 30-minute non-driving interruption follows eight cumulative driving hours. Fuel before exceeding 1,000 miles.",
            "Nearby city/state names are approximate. If lookup is unavailable, stop remarks retain route coordinates.",
            "Driver starts after at least 10 consecutive hours off duty, with a full tank.",
            "One hour each for pickup and dropoff; fueling takes 30 minutes.",
            "Previous daily cycle history is not supplied. A 34-hour restart is used when necessary; rolling recapture is not estimated.",
            "Full 10-hour rests are used; split-sleeper optimization is not applied.",
            "All sheets use the selected fixed home-terminal UTC offset, including across state lines.",
            "Road travel is estimated with an average speed cap of 55 mph. Truck restrictions and parking/fuel availability are not verified.",
        ]
        response = JsonResponse(result)
        response["Cache-Control"] = "no-store"
        return response
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        return JsonResponse(
            {
                "error": str(exc)
                if not isinstance(exc, json.JSONDecodeError)
                else "Invalid JSON trip details."
            },
            status=400,
        )
    except RequestDataTooBig:
        return JsonResponse({"error": "Trip details are too large."}, status=413)
    except providers.ProviderError as exc:
        return JsonResponse({"error": str(exc)}, status=503)
