from datetime import datetime, timedelta, timezone
from math import ceil
import pytest
from hypothesis import given, settings, strategies as st
from planner.schedule import Place, Leg, make_schedule

A = Place("Chicago, IL", -87.6298, 41.8781)
B = Place("Springfield, IL", -89.6501, 39.7817)
C = Place("Nashville, TN", -86.7816, 36.1627)
START = datetime(2026, 9, 15, 6, tzinfo=timezone(timedelta(hours=-6)))


def route(hours1=4, hours2=6, miles1=None, miles2=None):
    return [
        Leg(
            A,
            B,
            hours1 * 50 if miles1 is None else miles1,
            ceil(hours1 * 3600),
            [[A.lon, A.lat], [B.lon, B.lat]],
        ),
        Leg(
            B,
            C,
            hours2 * 50 if miles2 is None else miles2,
            ceil(hours2 * 3600),
            [[B.lon, B.lat], [C.lon, C.lat]],
        ),
    ]


def check_rules(result, initial_cycle):
    events = result["events"]
    shift_start = datetime.fromisoformat(events[0]["start"])
    driving = since_break = 0
    cycle = ceil(initial_cycle * 3600)
    fuel_miles = 0
    for i, event in enumerate(events):
        a, b = (
            datetime.fromisoformat(event["start"]),
            datetime.fromisoformat(event["end"]),
        )
        assert (b - a).total_seconds() == event["seconds"] > 0
        if i:
            assert events[i - 1]["end"] == event["start"]
        if event["kind"] in ("daily_rest", "cycle_restart"):
            assert event["seconds"] >= 10 * 3600
            shift_start = b
            driving = since_break = 0
            if event["kind"] == "cycle_restart":
                assert event["seconds"] >= 34 * 3600
                cycle = 0
        elif event["status"] == "driving":
            driving += event["seconds"]
            since_break += event["seconds"]
            cycle += event["seconds"]
            fuel_miles += event["miles"]
            assert driving <= 11 * 3600
            assert since_break <= 8 * 3600
            assert (b - shift_start).total_seconds() <= 14 * 3600
            assert cycle <= 70 * 3600
            assert fuel_miles <= 1000 + 1e-6
        else:
            if event["status"] == "on_duty":
                cycle += event["seconds"]
            if event["seconds"] >= 1800:
                since_break = 0
            if event["kind"] == "fuel":
                fuel_miles = 0
    for log in result["logs"]:
        assert sum(log["totals"].values()) == 86400
        assert log["segments"][0]["start_second"] == 0
        assert log["segments"][-1]["end_second"] == 86400
        for a, b in zip(log["segments"], log["segments"][1:]):
            assert a["end_second"] == b["start_second"]
    assert sum(log["miles"] for log in result["logs"]) == pytest.approx(
        result["summary"]["miles"]
    )
    assert sum(e["seconds"] for e in events) == result["summary"]["elapsed_seconds"]
    assert sum(e["kind"] == "pickup" for e in events) == 1
    assert sum(e["kind"] == "dropoff" for e in events) == 1


def test_short_trip_has_exact_service_and_mileage():
    result = make_schedule(route(2, 3), START, 0)
    assert [e["kind"] for e in result["events"]] == [
        "drive",
        "pickup",
        "drive",
        "dropoff",
    ]
    assert result["summary"]["miles"] == 250
    assert result["summary"]["elapsed_seconds"] == 7 * 3600
    check_rules(result, 0)


def test_eight_hours_then_pickup_already_satisfies_break():
    result = make_schedule(route(8, 1), START, 0)
    assert not any(e["kind"] == "break" for e in result["events"])
    check_rules(result, 0)


def test_break_required_before_ninth_hour():
    result = make_schedule(route(9, 1), START, 0)
    assert [e["kind"] for e in result["events"]][:3] == ["drive", "break", "drive"]
    assert result["events"][0]["seconds"] == 8 * 3600
    check_rules(result, 0)


def test_midnight_does_not_restore_driving_hours():
    result = make_schedule(route(10, 4), START.replace(hour=20), 0)
    first_rest = next(e for e in result["events"] if e["kind"] == "daily_rest")
    before_rest = [e for e in result["events"] if e["start"] < first_rest["start"]]
    assert (
        sum(e["seconds"] for e in before_rest if e["status"] == "driving") == 11 * 3600
    )
    check_rules(result, 0)


@pytest.mark.parametrize("cycle", [0, 0.125, 60, 69, 69.999, 70])
def test_cycle_boundaries(cycle):
    result = make_schedule(route(12, 15), START, cycle)
    check_rules(result, cycle)
    if cycle == 70:
        assert result["events"][0]["kind"] == "cycle_restart"


def test_cycle_restart_also_satisfies_daily_rest():
    result = make_schedule(route(15, 1), START, 59)
    kinds = [e["kind"] for e in result["events"]]
    index = kinds.index("cycle_restart")
    assert kinds[index + 1] != "daily_rest"
    assert kinds[index - 1] != "daily_rest"
    check_rules(result, 59)


def test_fuel_distance_continues_across_pickup():
    result = make_schedule(route(12, 12, 600, 600), START, 0)
    fuels = [e for e in result["events"] if e["kind"] == "fuel"]
    assert len(fuels) == 1
    assert 999 < fuels[0]["route_miles"] <= 1000
    check_rules(result, 0)


def test_fuel_at_break_boundary_prevents_duplicate_break():
    # Synthetic fast route isolates ordering of equal-distance/time boundaries.
    result = make_schedule(route(9, 1, 1125, 125), START, 0)
    assert result["events"][1]["kind"] == "fuel"
    assert result["events"][2]["kind"] == "drive"
    check_rules(result, 0)


def test_fourteen_hour_window_includes_non_driving_service():
    result = make_schedule(route(6, 6, 3000, 3000), START, 0)
    check_rules(result, 0)
    assert result["summary"]["daily_rests"] >= 1


def test_exact_midnight_arrival_does_not_create_empty_log():
    result = make_schedule(route(1, 1), START.replace(hour=20), 0)
    assert len(result["logs"]) == 1
    check_rules(result, 0)


def test_same_locations_still_has_two_service_hours():
    result = make_schedule(route(0, 0), START, 0)
    assert result["summary"]["miles"] == 0
    assert result["summary"]["elapsed_seconds"] == 7200
    check_rules(result, 0)


def test_interpolation_follows_bent_geometry():
    leg = Leg(A, C, 100, 7200, [[0, 0], [0, 1], [1, 1]])
    point = leg.point(0.25)
    assert point.lon == 0
    assert 0 < point.lat < 1


def test_long_trip_has_multiple_restarts_and_logs():
    result = make_schedule(route(90, 90), START, 40)
    assert result["summary"]["cycle_restarts"] >= 2
    assert len(result["logs"]) > 8
    check_rules(result, 40)


@settings(max_examples=120, deadline=None, derandomize=True)
@given(
    st.integers(0, 12000),
    st.integers(0, 12000),
    st.integers(0, 70000),
    st.integers(0, 23),
)
def test_generated_trips_preserve_all_rules(
    minutes1, minutes2, cycle_thousandths, hour
):
    cycle = cycle_thousandths / 1000
    result = make_schedule(
        route(minutes1 / 60, minutes2 / 60), START.replace(hour=hour), cycle
    )
    check_rules(result, cycle)


@pytest.mark.parametrize("cycle", [-1, 71])
def test_invalid_cycle_rejected(cycle):
    with pytest.raises(ValueError):
        make_schedule(route(), START, cycle)
