"""Recompute HOS windows from status intervals, independently of stop-kind names.

Reference: FMCSA property-carrier guide pp. 6–11 and 15–17. This oracle does
not use the scheduler's constants, clock state, summaries, or reset labels.
"""
from datetime import datetime, timedelta, timezone
from math import ceil

import pytest
from hypothesis import given, settings, strategies as st

from planner.schedule import Leg, Place, make_schedule

A = Place("Chicago, Illinois", -87.6298, 41.8781)
B = Place("Springfield, Illinois", -89.6501, 39.7817)
C = Place("Nashville, Tennessee", -86.7816, 36.1627)


def interval_audit(result, initial_cycle, expected_miles, expected_drive):
    events = result["events"]
    beginning = datetime.fromisoformat(events[0]["start"])
    spans = [(datetime.fromisoformat(e["start"]), datetime.fromisoformat(e["end"]), e["status"]) for e in events]
    assert spans[-1][1].isoformat() == result["summary"]["arrival"]
    assert result["summary"]["departure"] == beginning.isoformat()
    for i, (a, b, status) in enumerate(spans):
        assert status in ("off_duty", "sleeper", "driving", "on_duty")
        assert (b-a).total_seconds() == events[i]["seconds"] > 0
        if i: assert a == spans[i-1][1]

    def blocks(allowed, before):
        runs = []
        for a, b, status in spans:
            if a >= before: break
            b = min(b, before)
            if status in allowed:
                if runs and runs[-1][1] == a: runs[-1] = (runs[-1][0], b)
                else: runs.append((a, b))
        return runs

    def clock_start(allowed, minimum, before):
        valid = [b for a, b in blocks(allowed, before) if (b-a).total_seconds() >= minimum]
        return valid[-1] if valid else beginning

    def seconds_between(start, end, allowed):
        return sum(max(0, (min(b, end)-max(a, start)).total_seconds()) for a, b, status in spans if status in allowed)

    for a, b, status in spans:
        if status != "driving": continue
        daily = clock_start({"off_duty", "sleeper"}, 10*3600, a)
        work_start = min(x for x, _, s in spans if x >= daily and s in {"driving", "on_duty"})
        assert seconds_between(daily, b, {"driving"}) <= 11*3600
        assert (b-work_start).total_seconds() <= 14*3600
        interruption = clock_start({"off_duty", "sleeper", "on_duty"}, 30*60, a)
        assert seconds_between(interruption, b, {"driving"}) <= 8*3600
        cycle_start = clock_start({"off_duty", "sleeper"}, 34*3600, a)
        prior = ceil(initial_cycle*3600) if cycle_start == beginning else 0
        assert prior + seconds_between(cycle_start, b, {"driving", "on_duty"}) <= 70*3600

    driving = sum((b-a).total_seconds() for a, b, s in spans if s == "driving")
    assert driving == expected_drive == result["summary"]["driving_seconds"]
    assert sum(e["miles"] for e in events) == pytest.approx(expected_miles)
    assert result["summary"]["miles"] == pytest.approx(expected_miles)
    assert result["summary"]["elapsed_seconds"] == (spans[-1][1]-beginning).total_seconds()
    assert result["summary"]["on_duty_seconds"] == seconds_between(beginning, spans[-1][1], {"on_duty", "driving"})
    positions = [0.0] + [e["route_miles"] for e in events if e["kind"] == "fuel"] + [expected_miles]
    assert all(-1e-6 <= b-a <= 1000+1e-6 for a, b in zip(positions, positions[1:]))
    for kind in ("pickup", "dropoff"):
        service = [e for e in events if e["kind"] == kind]
        assert len(service) == 1 and service[0]["seconds"] == 3600 and service[0]["status"] == "on_duty"

    dates = [log["date"] for log in result["logs"]]
    expected_days = (spans[-1][1]-timedelta(microseconds=1)).date()-beginning.date()
    assert len(dates) == expected_days.days+1 and len(set(dates)) == len(dates)
    assert sum(log["miles"] for log in result["logs"]) == pytest.approx(expected_miles)
    for log in result["logs"]:
        midnight = datetime.fromisoformat(log["date"]).replace(tzinfo=beginning.tzinfo)
        end = midnight+timedelta(days=1)
        segments = log["segments"]
        assert segments[0]["start_second"] == 0 and segments[-1]["end_second"] == 86400
        assert all(a["end_second"] == b["start_second"] for a, b in zip(segments, segments[1:]))
        assert all(s["end_second"] > s["start_second"] for s in segments)
        for status in ("driving", "on_duty", "sleeper"):
            assert log["totals"][status] == seconds_between(midnight, end, {status})
        assert log["totals"]["off_duty"] == 86400-sum(log["totals"][s] for s in ("driving", "on_duty", "sleeper"))
        assert all(int(r["time"][:2]) < 24 and int(r["time"][3:]) < 60 for r in log["remarks"])


def trip(seconds1, seconds2, miles1=None, miles2=None):
    return [Leg(a, b, seconds/3600*55 if miles is None else miles, seconds,
                [[a.lon, a.lat], [a.lon, (a.lat+b.lat)/2], [b.lon, b.lat]])
            for a, b, seconds, miles in [(A, B, seconds1, miles1), (B, C, seconds2, miles2)]]


@pytest.mark.parametrize("seconds1,seconds2,cycle", [
    (0, 0, 0), (0, 0, 70), (0, 3600, 69), (3600, 0, 68),
    (8*3600-1, 1, 0), (8*3600, 1, 0), (8*3600+1, 1, 0),
    (11*3600-1, 2, 0), (11*3600, 1, 0), (11*3600+1, 1, 0),
    (1, 1, 70-1/3600), (3600, 3600, 67.999),
    (55*3600, 65*3600, 69.999), (0, 30*86400, 0),
])
def test_exact_clock_boundaries(seconds1, seconds2, cycle):
    legs = trip(seconds1, seconds2)
    departure = datetime(2026, 12, 31, 23, 59, tzinfo=timezone(timedelta(hours=-8)))
    result = make_schedule(legs, departure, cycle)
    interval_audit(result, cycle, sum(l.miles for l in legs), seconds1+seconds2)


@pytest.mark.parametrize("miles1,miles2", [(1000, 1), (999.999, .002), (500, 500), (500, 500.001), (1000, 1000), (0, 2000.001), (3500.25, 1500.75)])
def test_exact_fuel_boundaries(miles1, miles2):
    legs = trip(ceil(miles1/55*3600), ceil(miles2/55*3600), miles1, miles2)
    departure = datetime(2028, 2, 28, 23, 59, tzinfo=timezone(timedelta(hours=-4)))
    result = make_schedule(legs, departure, 69.75)
    interval_audit(result, 69.75, miles1+miles2, sum(l.seconds for l in legs))


@settings(max_examples=1500, deadline=None, derandomize=True)
@given(seconds1=st.integers(0, 100*3600), seconds2=st.integers(0, 100*3600),
       speed1=st.integers(1, 55), speed2=st.integers(1, 55), cycle_seconds=st.integers(0, 70*3600),
       minute=st.integers(0, 1439), offset=st.sampled_from([-480, -420, -360, -300, -240]))
def test_generated_schedules_against_independent_intervals(seconds1, seconds2, speed1, speed2, cycle_seconds, minute, offset):
    departure = datetime(2026, 9, 30, minute//60, minute%60, tzinfo=timezone(timedelta(minutes=offset)))
    legs = trip(seconds1, seconds2, seconds1/3600*speed1, seconds2/3600*speed2)
    result = make_schedule(legs, departure, cycle_seconds/3600)
    interval_audit(result, cycle_seconds/3600, sum(l.miles for l in legs), seconds1+seconds2)
