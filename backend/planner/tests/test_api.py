import copy
import json
from unittest.mock import patch
import pytest
from planner.providers import ProviderError
from .test_schedule import route

TRIP = {
    "current": {"label": "Chicago, IL", "lon": -87.6298, "lat": 41.8781},
    "pickup": {"label": "Springfield, IL", "lon": -89.6501, "lat": 39.7817},
    "dropoff": {"label": "Nashville, TN", "lon": -86.7816, "lat": 36.1627},
    "cycle_used": 0,
    "departure": "2026-09-15T06:00",
    "utc_offset_minutes": -360,
}


@pytest.fixture(autouse=True)
def no_optional_network():
    with patch("planner.providers.enrich_stop_labels"):
        yield


def test_api_integrates_route_and_schedule(client):
    with patch("planner.providers.fetch_route", return_value=route(4, 8)) as fetch:
        response = client.post("/api/plan", TRIP, content_type="application/json")
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    assert response.json()["summary"]["daily_rests"] == 1
    assert [p.label for p in fetch.call_args[0][0]] == [
        "Chicago, IL",
        "Springfield, IL",
        "Nashville, TN",
    ]


@pytest.mark.parametrize(
    "value", [-1, 71, True, "10", None, float("nan"), float("inf")]
)
def test_invalid_cycle_input(client, value):
    data = {**TRIP, "cycle_used": value}
    assert (
        client.post("/api/plan", data, content_type="application/json").status_code
        == 400
    )


@pytest.mark.parametrize(
    "key,value",
    [
        ("current", None),
        ("pickup", {"label": "x"}),
        ("departure", "not a date"),
        ("departure", "2026-01-01T00:00+05:00"),
        ("utc_offset_minutes", 0),
        ("driver_details", []),
    ],
)
def test_invalid_fields(client, key, value):
    assert (
        client.post(
            "/api/plan", {**TRIP, key: value}, content_type="application/json"
        ).status_code
        == 400
    )


def test_outside_supported_area(client):
    data = copy.deepcopy(TRIP)
    data["current"]["lon"] = 73
    assert (
        client.post("/api/plan", data, content_type="application/json").status_code
        == 400
    )


def test_invalid_json_and_content_type(client):
    assert (
        client.post("/api/plan", "{", content_type="application/json").status_code
        == 400
    )
    assert (
        client.post(
            "/api/plan", json.dumps(TRIP), content_type="text/plain"
        ).status_code
        == 415
    )
    assert client.get("/api/plan").status_code == 405


def test_provider_failure_never_fabricates_results(client):
    with patch(
        "planner.providers.fetch_route", side_effect=ProviderError("Route unavailable.")
    ):
        response = client.post("/api/plan", TRIP, content_type="application/json")
    assert response.status_code == 503
    assert response.json() == {"error": "Route unavailable."}


def test_location_results_and_empty_query(client):
    assert client.get("/api/locations?q=x").status_code == 400
    with patch("planner.providers.search_places", return_value=[TRIP["current"]]):
        response = client.get("/api/locations?q=Chicago")
    assert response.json()["places"][0]["label"] == "Chicago, IL"


def test_location_failure(client):
    with patch(
        "planner.providers.search_places", side_effect=ProviderError("Unavailable")
    ):
        assert client.get("/api/locations?q=Chicago").status_code == 503


def test_large_payload_is_rejected(client):
    response = client.post(
        "/api/plan", json.dumps({"x": "a" * 40000}), content_type="application/json"
    )
    assert response.status_code == 413
