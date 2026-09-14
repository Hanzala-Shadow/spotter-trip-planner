"""Failure cases found while auditing the public input and provider boundaries."""
from copy import deepcopy
from unittest.mock import patch

import pytest

from planner import providers
from .test_api import TRIP
from .test_schedule import A, B, C, route


@pytest.mark.parametrize("field", ["cycle_used", "utc_offset_minutes", "longitude", "latitude"])
def test_very_large_json_numbers_return_400(client, field):
    data = deepcopy(TRIP)
    if field in ("longitude", "latitude"):
        data["current"]["lon" if field == "longitude" else "lat"] = 10**400
    else:
        data[field] = 10**400
    response = client.post("/api/plan", data, content_type="application/json")
    assert response.status_code == 400
    assert "error" in response.json()


@pytest.mark.parametrize("departure", ["2026-09-15", "20260915", "2026-09-15T06", "2026-09-15X06:00"])
def test_departure_requires_an_explicit_date_and_time(client, departure):
    with patch.object(providers, "fetch_route", return_value=route(1, 1)), patch.object(providers, "enrich_stop_labels"):
        response = client.post("/api/plan", {**TRIP, "departure": departure}, content_type="application/json")
    assert response.status_code == 400


@pytest.mark.parametrize("payload", [{}, {"features": None}, {"features": {}}, {"features": "unavailable"}])
def test_malformed_search_envelopes_return_a_useful_503(client, payload):
    with patch.object(providers, "get_json", return_value=payload):
        response = client.get("/api/locations", {"q": "Chicago"})
    assert response.status_code == 503
    assert "error" in response.json()


@pytest.mark.parametrize("coordinates", [["bad", 41], [True, 41], [float("nan"), 41], [10**400, 41], [-87, None], [-87, 91], [0, 41]])
def test_search_ignores_invalid_coordinates(coordinates):
    invalid = {"properties": {"name": "Invalid", "countrycode": "US"}, "geometry": {"coordinates": coordinates}}
    valid = {"properties": {"name": "Chicago", "state": "Illinois", "countrycode": "US"}, "geometry": {"coordinates": [-87, 41]}}
    with patch.object(providers, "get_json", return_value={"features": [None, invalid, valid]}):
        assert providers.search_places("Chicago") == [{"label": "Chicago, Illinois", "lon": -87, "lat": 41}]


def provider_route():
    legs = []
    for start, end in [(A, B), (B, C)]:
        legs.append({"distance": 1609.344, "duration": 120, "steps": [{
            "distance": 1609.344, "name": "Test Road", "maneuver": {"type": "depart"},
            "geometry": {"coordinates": [[start.lon, start.lat], [end.lon, end.lat]]},
        }]})
    return {"code": "Ok", "routes": [{"legs": legs}]}


@pytest.mark.parametrize("case", ["route_null", "legs_null", "step_null", "maneuver_null", "geometry_null", "nan_point", "short_point", "huge_duration", "negative_step", "nan_step"])
def test_invalid_route_payloads_become_503(client, case):
    payload = provider_route()
    leg = payload["routes"][0]["legs"][0]
    step = leg["steps"][0]
    if case == "route_null": payload["routes"] = [None]
    elif case == "legs_null": payload["routes"][0]["legs"] = None
    elif case == "step_null": leg["steps"] = [None]
    elif case == "maneuver_null": step["maneuver"] = None
    elif case == "geometry_null": step["geometry"] = None
    elif case == "nan_point": step["geometry"]["coordinates"][0] = [float("nan"), 41]
    elif case == "short_point": step["geometry"]["coordinates"][0] = [-87]
    elif case == "huge_duration": leg["duration"] = 10**400
    elif case == "negative_step": step["distance"] = -1
    elif case == "nan_step": step["distance"] = float("nan")
    with patch.object(providers, "get_json", return_value=payload), patch.object(providers, "enrich_stop_labels"):
        response = client.post("/api/plan", TRIP, content_type="application/json")
    assert response.status_code == 503
    assert "error" in response.json()


@pytest.mark.parametrize("method,path", [("post", "/api/health"), ("post", "/api/locations"), ("get", "/api/plan"), ("put", "/api/plan"), ("delete", "/api/plan")])
def test_unsupported_methods_are_rejected(client, method, path):
    assert getattr(client, method)(path).status_code == 405


@pytest.mark.parametrize("payload", ["null", "[]", "true", '"trip"', "{", '{"cycle_used":NaN}'])
def test_invalid_json_shapes_are_400(client, payload):
    assert client.post("/api/plan", payload, content_type="application/json").status_code == 400


@pytest.mark.parametrize("field", ["driver", "carrier", "vehicle", "shipping", "office"])
def test_optional_text_limit_is_enforced(client, field):
    response = client.post("/api/plan", {**TRIP, "driver_details": {field: "x"*151}}, content_type="application/json")
    assert response.status_code == 400
