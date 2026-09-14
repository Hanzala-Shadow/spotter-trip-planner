"""Generate a deterministic Django response for component and contract tests.

Routing is a declared fixture. No public service is called by this script.
"""
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from django.test import Client, override_settings
from planner.schedule import Leg

TRIP = {
    'current': {'label':'Chicago, Illinois','lat':41.8781,'lon':-87.6298},
    'pickup': {'label':'Springfield, Illinois','lat':39.7817,'lon':-89.6501},
    'dropoff': {'label':'Nashville, Tennessee','lat':36.1627,'lon':-86.7816},
    'cycle_used':0,'departure':'2026-09-15T06:00','utc_offset_minutes':-360,
    'driver_details':{'driver':'','carrier':'','vehicle':'','shipping':'','office':''},
}


def fixture_route(places):
    return [Leg(places[i],places[i+1],hours*55,hours*3600,
                [[places[i].lon,places[i].lat],[places[i+1].lon,places[i+1].lat]],
                [{'instruction':f'Drive to {places[i+1].label}','miles':hours*55}])
            for i,hours in enumerate([4,16])]


if __name__ == '__main__':
    with override_settings(ALLOWED_HOSTS=['testserver']), patch('planner.providers.fetch_route',side_effect=fixture_route), patch('planner.providers.enrich_stop_labels'):
        response=Client().post('/api/plan',TRIP,content_type='application/json')
    assert response.status_code==200, response.content
    folder=ROOT/'frontend/src/__fixtures__'
    folder.mkdir(exist_ok=True)
    (folder/'request.json').write_text(json.dumps(TRIP,indent=2)+'\n')
    (folder/'plan.json').write_text(json.dumps(response.json(),indent=2)+'\n')
    print(f'Generated Django contract fixture: {len(response.json()["logs"])} daily logs')
