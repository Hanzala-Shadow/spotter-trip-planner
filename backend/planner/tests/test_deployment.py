"""Exercise the same WSGI exports used by Vercel, including POST bodies."""
import importlib.util
import json
from io import BytesIO
from pathlib import Path
from unittest.mock import patch
import pytest
from .test_api import TRIP
from .test_schedule import route


@pytest.mark.parametrize('endpoint,method,body,status',[
    ('health','GET',None,'200'),
    ('locations','GET',None,'200'),
    ('plan','POST',TRIP,'200'),
    ('plan','POST',{'cycle_used':71},'400'),
    ('plan','GET',None,'405'),
])
def test_vercel_wsgi_exports(endpoint,method,body,status):
    path=Path(__file__).resolve().parents[3]/'api'/f'{endpoint}.py'
    spec=importlib.util.spec_from_file_location(f'vercel_{endpoint}',path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    raw=json.dumps(body).encode() if body else b''
    environ={'REQUEST_METHOD':method,'PATH_INFO':'/provider-internal-path','QUERY_STRING':'q=Chicago',
             'SERVER_NAME':'localhost','SERVER_PORT':'8000','SERVER_PROTOCOL':'HTTP/1.1',
             'wsgi.version':(1,0),'wsgi.url_scheme':'http','wsgi.input':BytesIO(raw),
             'wsgi.errors':BytesIO(),'wsgi.multithread':False,'wsgi.multiprocess':False,'wsgi.run_once':False,
             'CONTENT_TYPE':'application/json','CONTENT_LENGTH':str(len(raw))}
    headers=[]
    with patch('planner.providers.fetch_route',return_value=route(4,8)),patch('planner.providers.enrich_stop_labels'),patch('planner.providers.search_places',return_value=[TRIP['current']]):
        response=b''.join(module.app(environ,lambda s,h:headers.append((s,h))))
    assert headers[0][0].startswith(status)
    if status=='200':assert json.loads(response)
