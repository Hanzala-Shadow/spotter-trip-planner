"""Small adapters for replaceable OpenStreetMap-based public services."""
import os
import time
from math import ceil, isfinite
from threading import Lock
import httpx
from .schedule import Leg, Place


class ProviderError(Exception):
    pass


_cache = {}
_lock = Lock()


def get_json(url, params, timeout=15):
    key = (url, tuple(sorted(params.items())))
    with _lock:
        hit = _cache.get(key)
        if hit and hit[0] > time.monotonic():
            return hit[1]
    try:
        response = httpx.get(url, params=params, timeout=httpx.Timeout(timeout, connect=min(5, timeout)),
                             headers={"User-Agent": "Waypoint-Trip-Planner/1.0 (assessment demo)", "Accept": "application/json"})
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError("Expected a JSON object")
    except (httpx.HTTPError, ValueError) as exc:
        raise ProviderError("The map service is unavailable. Please try again shortly.") from exc
    with _lock:
        if len(_cache) >= 128:
            _cache.pop(next(iter(_cache)))
        _cache[key] = (time.monotonic()+900, data)
    return data


def search_places(query):
    base = os.environ.get("PHOTON_BASE_URL", "https://photon.komoot.io").rstrip("/")
    data = get_json(base+"/api/", {"q": query, "limit": 6, "lang": "en", "bbox": "-125,24,-66,50"})
    places = []
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        if props.get("countrycode", "").upper() != "US":
            continue
        coords = feature.get("geometry", {}).get("coordinates", [])
        if len(coords) != 2:
            continue
        parts = []
        for key in ("name", "city", "state"):
            value = props.get(key)
            if value and value not in parts:
                parts.append(value)
        if parts:
            places.append(Place(", ".join(parts), coords[0], coords[1]).json())
    return places


def fetch_route(places):
    coords = ";".join(f"{p.lon:.6f},{p.lat:.6f}" for p in places)
    base = os.environ.get("OSRM_BASE_URL", "https://router.project-osrm.org").rstrip("/")
    data = get_json(base+"/route/v1/driving/"+coords,
                    {"overview": "full", "geometries": "geojson", "steps": "true", "radiuses": "10000;10000;10000"})
    if data.get("code") != "Ok" or not data.get("routes"):
        raise ProviderError("No drivable route was found through all three locations. Try nearby road addresses.")
    route = data["routes"][0]
    if len(route.get("legs", [])) != 2:
        raise ProviderError("The routing service returned an incomplete trip. Please try again.")
    legs = []
    try:
        for i, raw in enumerate(route["legs"]):
            miles = float(raw["distance"])/1609.344
            duration = float(raw["duration"])
            if not isfinite(miles) or not isfinite(duration) or miles < 0 or duration < 0:
                raise ValueError("Invalid route values")
            seconds = ceil(max(duration, miles/55*3600))
            geometry, directions = [], []
            for step in raw.get("steps", []):
                for point in step.get("geometry", {}).get("coordinates", []):
                    if not geometry or point != geometry[-1]:
                        geometry.append(point)
                maneuver = step.get("maneuver", {})
                action = maneuver.get("type", "continue").replace("_", " ")
                modifier = maneuver.get("modifier", "")
                road = step.get("name") or step.get("ref") or "the road"
                instruction = f"{action.capitalize()} {modifier} onto {road}".replace("  ", " ")
                if action == "depart": instruction = f"Depart on {road}"
                if action == "arrive": instruction = f"Arrive at {places[i+1].label}"
                directions.append({"instruction": instruction, "miles": float(step.get("distance", 0))/1609.344})
            if len(geometry) < 2:
                if miles > .01:
                    raise ValueError("Missing road geometry")
                geometry = [[places[i].lon, places[i].lat], [places[i+1].lon, places[i+1].lat]]
            legs.append(Leg(places[i], places[i+1], miles, seconds, geometry, directions))
    except (KeyError, TypeError, ValueError) as exc:
        raise ProviderError("The routing service returned an invalid route. Please try again.") from exc
    if sum(leg.miles for leg in legs) > 20000 or sum(leg.seconds for leg in legs) > 30*86400:
        raise ProviderError("This route exceeds the planner's size limit. Split it into smaller trips.")
    return legs


def nearby_label(place):
    """Best-effort city/state for a planned roadside point; never claim a facility."""
    base = os.environ.get("PHOTON_BASE_URL", "https://photon.komoot.io").rstrip("/")
    try:
        data = get_json(base+"/reverse", {"lon": round(place["lon"], 5), "lat": round(place["lat"], 5), "limit": 1, "lang": "en"}, timeout=3)
        for feature in data.get("features", []):
            props = feature.get("properties", {})
            city = props.get("city") or props.get("district") or props.get("county")
            state = props.get("state")
            if city and state and props.get("countrycode", "").upper() == "US":
                return f"Near {city}, {state} · {place['lat']:.3f}, {place['lon']:.3f}"
    except (ProviderError, TypeError, AttributeError):
        pass
    return place["label"]


def enrich_stop_labels(events):
    """Bound optional enrichment to eight unique points and two concurrent calls.

    Network failures retain the precise coordinates, and cannot invalidate a trip.
    Clock calculations remain exclusively in schedule.py.
    """
    from concurrent.futures import ThreadPoolExecutor
    points = {}
    for event in events:
        place = event["start_place"]
        if event["kind"] != "drive" and place["label"].startswith("Along route"):
            points[(round(place["lon"], 5), round(place["lat"], 5))] = place
    selected = list(points.items())[:8]
    if not selected:
        return
    with ThreadPoolExecutor(max_workers=2) as pool:
        labels = dict(zip((key for key, _ in selected), pool.map(nearby_label, (place for _, place in selected))))
    for event in events:
        for field in ("start_place", "end_place"):
            place = event[field]
            key = (round(place["lon"], 5), round(place["lat"], 5))
            if key in labels and place["label"].startswith("Along route"):
                event[field] = {**place, "label": labels[key]}
