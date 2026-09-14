"""Pure trip scheduling. All clocks use integer seconds; distances use miles."""
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from math import ceil, hypot
from bisect import bisect_left

HOUR = 3600
DRIVE_LIMIT = 11 * HOUR
SHIFT_WINDOW = 14 * HOUR
BREAK_AFTER = 8 * HOUR
CYCLE_LIMIT = 70 * HOUR
DAILY_REST = 10 * HOUR
CYCLE_REST = 34 * HOUR
FUEL_MILES = 1000.0
EPS = 1e-7
STATUSES = ("off_duty", "sleeper", "driving", "on_duty")


@dataclass(frozen=True)
class Place:
    label: str
    lon: float
    lat: float

    def json(self):
        return {"label": self.label, "lon": self.lon, "lat": self.lat}


@dataclass
class Leg:
    start: Place
    end: Place
    miles: float
    seconds: int
    coordinates: list[list[float]]
    directions: list[dict] = field(default_factory=list)
    lengths: list[float] = field(default_factory=list, init=False, repr=False)

    def __post_init__(self):
        from math import cos, radians
        self.lengths = [0.0]
        for a, b in zip(self.coordinates, self.coordinates[1:]):
            self.lengths.append(self.lengths[-1] + hypot((b[0]-a[0])*cos(radians((a[1]+b[1])/2)), b[1]-a[1]))

    def point(self, fraction):
        """Interpolate along road geometry, never across the route's endpoints."""
        points = self.coordinates
        if fraction <= EPS:
            return self.start
        if fraction >= 1 - EPS:
            return self.end
        if len(points) < 2 or self.lengths[-1] == 0:
            return self.start
        target = fraction * self.lengths[-1]
        index = max(1, min(len(points)-1, bisect_left(self.lengths, target)))
        a, b = points[index-1], points[index]
        length = self.lengths[index]-self.lengths[index-1]
        part = (target-self.lengths[index-1])/length if length else 0
        lon, lat = a[0]+part*(b[0]-a[0]), a[1]+part*(b[1]-a[1])
        return Place(f"Along route · {lat:.3f}, {lon:.3f}", lon, lat)


def make_schedule(legs: list[Leg], departure: datetime, cycle_used: float):
    if len(legs) != 2:
        raise ValueError("The trip must contain a current-to-pickup and pickup-to-dropoff leg.")
    if departure.tzinfo is None:
        raise ValueError("Departure must include a time zone.")
    if not 0 <= cycle_used <= 70:
        raise ValueError("Cycle used must be between 0 and 70 hours.")
    for leg in legs:
        if leg.miles < 0 or leg.seconds < 0 or (leg.miles > 0 and leg.seconds <= 0):
            raise ValueError("Route distance and duration are invalid.")
    now = departure
    shift_start = now
    driven = 0
    since_break = 0
    cycle = ceil(cycle_used * HOUR)
    fuel_distance = 0.0
    total_miles = 0.0
    events = []

    def add(status, kind, seconds, start, end=None, miles=0, reason=""):
        nonlocal now, driven, since_break, cycle, total_miles, fuel_distance
        if seconds <= 0:
            return
        end = end or start
        finish = now + timedelta(seconds=seconds)
        events.append({"id": len(events)+1, "status": status, "kind": kind,
                       "start": now.isoformat(), "end": finish.isoformat(),
                       "seconds": seconds, "miles": miles, "start_place": start.json(),
                       "end_place": end.json(), "reason": reason,
                       "route_miles": total_miles})
        now = finish
        if status in ("driving", "on_duty"):
            cycle += seconds
        if status == "driving":
            driven += seconds
            since_break += seconds
            total_miles += miles
            fuel_distance += miles
        elif seconds >= 1800:
            since_break = 0

    def rest(place, restart=False):
        nonlocal driven, since_break, cycle, shift_start
        add("off_duty" if restart else "sleeper", "cycle_restart" if restart else "daily_rest",
            CYCLE_REST if restart else DAILY_REST, place,
            reason="34-hour restart restores the 70-hour cycle." if restart else "10 consecutive hours of rest restore the daily driving clocks.")
        driven = since_break = 0
        shift_start = now
        if restart:
            cycle = 0

    def service(kind, seconds, place):
        # Conservative choice: rest before starting a service that consumes the
        # last cycle hours. This keeps all scheduled on-duty work within 70 hours.
        if cycle + seconds > CYCLE_LIMIT:
            rest(place, restart=True)
        add("on_duty", kind, seconds, place,
            reason={"pickup": "One hour to collect the load.", "dropoff": "One hour to deliver the load.", "fuel": "30-minute fuel stop; resets distance since fueling."}[kind])

    for leg_index, leg in enumerate(legs):
        elapsed = 0
        miles_done = 0.0
        while elapsed < leg.seconds:
            place = leg.point(elapsed / leg.seconds)
            # A cycle restart also satisfies daily rest; never insert both.
            if cycle >= CYCLE_LIMIT:
                rest(place, restart=True)
                continue
            if driven >= DRIVE_LIMIT or (now - shift_start).total_seconds() >= SHIFT_WINDOW:
                rest(place)
                continue
            # Fuel before driving further. A fuel stop can also satisfy the
            # 30-minute driving interruption, so it comes before a separate break.
            remaining_miles = leg.miles - miles_done
            remaining_seconds = leg.seconds - elapsed
            speed = remaining_miles / remaining_seconds if remaining_seconds else 0
            seconds_to_fuel = int((FUEL_MILES-fuel_distance + EPS) / speed) if speed > 0 else remaining_seconds
            if speed > 0 and seconds_to_fuel < 1:
                service("fuel", 1800, place)
                fuel_distance = 0.0
                continue
            if since_break >= BREAK_AFTER:
                add("off_duty", "break", 1800, place,
                    reason="30 minutes without driving after eight cumulative driving hours.")
                continue
            shift_left = SHIFT_WINDOW - int((now-shift_start).total_seconds())
            seconds = min(remaining_seconds, DRIVE_LIMIT-driven, BREAK_AFTER-since_break,
                          CYCLE_LIMIT-cycle, shift_left, seconds_to_fuel)
            if seconds <= 0:
                raise ValueError("The schedule cannot advance with the supplied route.")
            miles = remaining_miles if seconds == remaining_seconds else speed * seconds
            finish_place = leg.point((elapsed+seconds)/leg.seconds)
            add("driving", "drive", seconds, place, finish_place, miles,
                f"Drive to {leg.end.label}.")
            elapsed += seconds
            miles_done += miles
            if len(events) > 2500:
                raise ValueError("This trip is too long to plan. Split it into smaller trips.")
        service("pickup" if leg_index == 0 else "dropoff", HOUR, leg.end)

    return {"events": events, "logs": daily_logs(events, departure),
            "summary": {"miles": total_miles, "driving_seconds": sum(e["seconds"] for e in events if e["status"] == "driving"),
                        "on_duty_seconds": sum(e["seconds"] for e in events if e["status"] in ("driving", "on_duty")),
                        "rest_seconds": sum(e["seconds"] for e in events if e["status"] in ("off_duty", "sleeper")),
                        "elapsed_seconds": int((now-departure).total_seconds()), "departure": departure.isoformat(),
                        "arrival": now.isoformat(), "cycle_used_at_finish": cycle/HOUR,
                        "fuel_stops": sum(e["kind"] == "fuel" for e in events),
                        "daily_rests": sum(e["kind"] == "daily_rest" for e in events),
                        "cycle_restarts": sum(e["kind"] == "cycle_restart" for e in events)}}


def daily_logs(events, departure):
    """Split the one authoritative event sequence into complete 24-hour sheets."""
    trip_end = datetime.fromisoformat(events[-1]["end"])
    midnight = departure.replace(hour=0, minute=0, second=0, microsecond=0)
    logs = []
    while midnight < trip_end:
        next_midnight = midnight + timedelta(days=1)
        segments = []
        remarks = []
        for event in events:
            start, end = datetime.fromisoformat(event["start"]), datetime.fromisoformat(event["end"])
            a, b = max(start, midnight), min(end, next_midnight)
            if a >= b:
                continue
            duration = int((b-a).total_seconds())
            segments.append({"status": event["status"], "kind": event["kind"],
                             "start_second": int((a-midnight).total_seconds()),
                             "end_second": int((b-midnight).total_seconds()),
                             "miles": event["miles"] * duration/event["seconds"], "event_id": event["id"]})
            remarks.append({"time": a.strftime("%H:%M"), "kind": event["kind"],
                            "location": event["start_place"]["label"] if a == start else "Continued from previous log",
                            "reason": event["reason"]})
        if segments[0]["start_second"] > 0:
            segments.insert(0, {"status": "off_duty", "kind": "assumed_off_duty", "start_second": 0,
                                "end_second": segments[0]["start_second"], "miles": 0, "event_id": None})
            remarks.insert(0, {"time": "00:00", "kind": "assumed_off_duty", "location": events[0]["start_place"]["label"], "reason": "Assumed off duty before this planned trip."})
        if segments[-1]["end_second"] < 86400:
            segments.append({"status": "off_duty", "kind": "assumed_off_duty", "start_second": segments[-1]["end_second"],
                             "end_second": 86400, "miles": 0, "event_id": None})
            remarks.append({"time": trip_end.strftime("%H:%M"), "kind": "assumed_off_duty", "location": events[-1]["end_place"]["label"], "reason": "Assumed off duty after this planned trip."})
        totals = {status: sum(s["end_second"]-s["start_second"] for s in segments if s["status"] == status) for status in STATUSES}
        logs.append({"date": midnight.date().isoformat(), "segments": segments, "totals": totals,
                     "miles": sum(s["miles"] for s in segments), "remarks": remarks})
        midnight = next_midnight
    return logs
