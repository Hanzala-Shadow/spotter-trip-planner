from datetime import datetime, timedelta, timezone
from math import isfinite
import re
from .schedule import Place


def number(value, minimum, maximum, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not minimum <= value <= maximum or not isfinite(value):
        raise ValueError(f"{label} must be a number between {minimum} and {maximum}.")
    return value


def validate_trip(data):
    if not isinstance(data, dict):
        raise ValueError("Send a trip as a JSON object.")
    places = []
    for key, label in [("current", "Current location"), ("pickup", "Pickup location"), ("dropoff", "Dropoff location")]:
        raw = data.get(key)
        if not isinstance(raw, dict) or not isinstance(raw.get("label"), str) or not raw["label"].strip() or len(raw["label"]) > 200:
            raise ValueError(f"Select a valid {label.lower()}.")
        lon = number(raw.get("lon"), -125, -66, label+" longitude")
        lat = number(raw.get("lat"), 24, 50, label+" latitude")
        places.append(Place(raw["label"].strip(), lon, lat))
    cycle = number(data.get("cycle_used"), 0, 70, "Current cycle used")
    offset = number(data.get("utc_offset_minutes", -360), -480, -240, "Home terminal UTC offset")
    if int(offset) != offset:
        raise ValueError("Home terminal UTC offset must be whole minutes.")
    try:
        raw_departure = data.get("departure", "")
        if not isinstance(raw_departure, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?", raw_departure): raise ValueError()
        departure = datetime.fromisoformat(raw_departure)
        if departure.tzinfo is not None: raise ValueError()
        if not 2020 <= departure.year <= 2100: raise ValueError()
        departure = departure.replace(tzinfo=timezone(timedelta(minutes=offset)), second=0, microsecond=0)
    except (ValueError, TypeError):
        raise ValueError("Provide a valid local departure date and time between 2020 and 2100.") from None
    details = data.get("driver_details", {})
    if not isinstance(details, dict): raise ValueError("Driver details must be an object.")
    clean_details = {}
    for key in ("driver", "carrier", "vehicle", "shipping", "office"):
        value = details.get(key, "")
        if not isinstance(value, str) or len(value) > 150:
            raise ValueError("Driver details must be text no longer than 150 characters.")
        clean_details[key] = value.strip()
    return places, departure, cycle, clean_details
