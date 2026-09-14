"""Offline browser-test server. Never used by Vercel or production code."""

from unittest.mock import patch
from wsgiref.simple_server import make_server
from serve_preview import preview_app
from generate_fixtures import fixture_route
from planner.providers import ProviderError


def fixture_search(query):
    if query == "No results":
        return []
    if query == "Unavailable":
        raise ProviderError("Location search is unavailable. Please try again.")
    if query == "Chicago":
        return [{"label": "Chicago, Illinois", "lat": 41.8781, "lon": -87.6298}]
    return [{"label": "Denver, Colorado", "lat": 39.7392, "lon": -104.9903}]


if __name__ == "__main__":
    with (
        patch("planner.providers.fetch_route", side_effect=fixture_route),
        patch("planner.providers.enrich_stop_labels"),
        patch("planner.providers.search_places", side_effect=fixture_search),
    ):
        with make_server("127.0.0.1", 8000, preview_app) as server:
            print("Offline E2E fixture server on http://127.0.0.1:8000", flush=True)
            server.serve_forever()
