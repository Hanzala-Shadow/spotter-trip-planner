"""Opt-in live service check against the production build + Django over HTTP.

Uses public map services. Ordinary pytest/Vitest runs are offline and deterministic.
"""
import json
import threading
import urllib.request
from wsgiref.simple_server import make_server, WSGIRequestHandler
from pathlib import Path
from serve_preview import preview_app
from generate_fixtures import TRIP

class QuietHandler(WSGIRequestHandler):
    def log_message(self, *args): pass


def main():
    with make_server('127.0.0.1',0,preview_app,handler_class=QuietHandler) as server:
        worker=threading.Thread(target=server.serve_forever,daemon=True)
        worker.start()
        base=f'http://127.0.0.1:{server.server_port}'
        report={'health':json.load(urllib.request.urlopen(base+'/api/health')),'trips':[]}
        html=urllib.request.urlopen(base).read().decode()
        assert '<div id="root">' in html and '/assets/' in html
        samples=[('Day trip',TRIP),('Cycle restart',{**TRIP,'cycle_used':68}),('Multi-day',{
            **TRIP,'cycle_used':20,
            'current':{'label':'Los Angeles, California','lat':34.0522,'lon':-118.2437},
            'pickup':{'label':'Phoenix, Arizona','lat':33.4484,'lon':-112.074},
            'dropoff':{'label':'Dallas, Texas','lat':32.7767,'lon':-96.797},
        })]
        try:
            for label,payload in samples:
                request=urllib.request.Request(base+'/api/plan',json.dumps(payload).encode(),{'Content-Type':'application/json'})
                raw=urllib.request.urlopen(request,timeout=55).read()
                result=json.loads(raw)
                assert len(result['route']['legs'])==2
                assert all(sum(log['totals'].values())==86400 for log in result['logs'])
                assert result['summary']['miles']>0
                if label=='Cycle restart':assert result['summary']['cycle_restarts']>=1
                if label=='Multi-day':assert len(result['logs'])>=2 and result['summary']['fuel_stops']>=1
                row={'sample':label,'summary':result['summary'],'daily_logs':len(result['logs']),'response_bytes':len(raw),
                     'stop_labels':[e['start_place']['label'] for e in result['events'] if e['kind'] not in ('drive','pickup','dropoff')]}
                report['trips'].append(row)
                print(json.dumps(row),flush=True)
            folder=Path(__file__).resolve().parents[1]/'docs/qa'
            folder.mkdir(exist_ok=True)
            (folder/'live-report.json').write_text(json.dumps(report,indent=2)+'\n')
            print('PASS: production HTML + health + 3 real routed trip POSTs over HTTP',flush=True)
        finally:
            server.shutdown()
            worker.join(timeout=2)

if __name__=='__main__':main()
