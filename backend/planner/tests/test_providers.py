from unittest.mock import patch
import httpx
import pytest
from planner import providers
from .test_schedule import A, B, C


def test_no_route_is_reported():
    with patch.object(providers, "get_json", return_value={"code": "NoRoute"}):
        with pytest.raises(providers.ProviderError):
            providers.fetch_route([A, B, C])


def test_empty_geometry_on_nonzero_trip_is_rejected():
    data = {
        "code": "Ok",
        "routes": [{"legs": [{"distance": 1000, "duration": 60, "steps": []}] * 2}],
    }
    with patch.object(providers, "get_json", return_value=data):
        with pytest.raises(providers.ProviderError):
            providers.fetch_route([A, B, C])


def test_duration_has_documented_speed_cap():
    raw = {
        "distance": 160934.4,
        "duration": 3600,
        "steps": [
            {
                "geometry": {"coordinates": [[A.lon, A.lat], [B.lon, B.lat]]},
                "maneuver": {"type": "depart"},
                "distance": 160934.4,
                "name": "I-55",
            }
        ],
    }
    with patch.object(
        providers,
        "get_json",
        return_value={"code": "Ok", "routes": [{"legs": [raw, raw]}]},
    ):
        legs = providers.fetch_route([A, B, C])
    assert legs[0].seconds >= 100 / 55 * 3600
    assert legs[0].miles == pytest.approx(100)


def test_request_timeout_becomes_provider_error():
    with patch.object(
        providers.httpx, "get", side_effect=httpx.ReadTimeout("timed out")
    ):
        with pytest.raises(providers.ProviderError):
            providers.get_json("https://example.test/timeout", {})


def test_search_filters_non_us_locations():
    features = [
        {
            "properties": {"name": "Paris", "countrycode": "FR"},
            "geometry": {"coordinates": [2, 48]},
        },
        {
            "properties": {
                "name": "Chicago",
                "city": "Chicago",
                "state": "Illinois",
                "countrycode": "US",
            },
            "geometry": {"coordinates": [-87, 41]},
        },
    ]
    with patch.object(providers, "get_json", return_value={"features": features}):
        assert providers.search_places("Chicago") == [
            {"label": "Chicago, Illinois", "lon": -87, "lat": 41}
        ]


def test_reverse_lookup_is_approximate_city_state():
    data = {
        "features": [
            {
                "properties": {
                    "city": "Flagstaff",
                    "state": "Arizona",
                    "countrycode": "US",
                }
            }
        ]
    }
    with patch.object(providers, "get_json", return_value=data):
        label = providers.nearby_label(
            {"lon": -111.65, "lat": 35.2, "label": "Along route"}
        )
    assert label == "Near Flagstaff, Arizona · 35.200, -111.650"


def test_reverse_failure_preserves_coordinate_label():
    place = {"lon": -111.65, "lat": 35.2, "label": "Along route · 35.200, -111.650"}
    with patch.object(providers, "get_json", side_effect=providers.ProviderError()):
        assert providers.nearby_label(place) == place["label"]


def test_enrichment_changes_names_without_moving_events():
    from copy import deepcopy
    from .test_schedule import route
    from planner.schedule import make_schedule
    from datetime import datetime, timezone

    events = make_schedule(route(4, 20), datetime(2026, 9, 15, tzinfo=timezone.utc), 0)[
        "events"
    ]
    original = deepcopy(events)
    with patch.object(
        providers, "nearby_label", return_value="Near Test City, Arizona"
    ) as lookup:
        providers.enrich_stop_labels(events)
    assert 0 < lookup.call_count <= 8
    assert any(e["start_place"]["label"] == "Near Test City, Arizona" for e in events)
    for before, after in zip(original, events):
        assert before["start"] == after["start"] and before["end"] == after["end"]
        assert before["miles"] == after["miles"]
        assert before["start_place"]["lon"] == after["start_place"]["lon"]
