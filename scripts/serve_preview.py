"""Serve the production frontend and Django locally, on one origin.

For development/verification only; Vercel serves static files in deployment.
"""
import argparse
import mimetypes
import os
from pathlib import Path
import sys
from wsgiref.simple_server import make_server

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
from config.wsgi import application
DIST=ROOT/'frontend/dist'


def preview_app(environ,start_response):
    path=environ.get('PATH_INFO','/')
    if path.startswith('/api/'):
        return application(environ,start_response)
    target=(DIST/path.lstrip('/')).resolve()
    if path=='/': target=DIST/'index.html'
    if not target.is_relative_to(DIST.resolve()) or not target.is_file():
        start_response('404 Not Found',[('Content-Type','text/plain')])
        return [b'Not found']
    data=target.read_bytes()
    mime=mimetypes.guess_type(str(target))[0] or 'application/octet-stream'
    start_response('200 OK',[('Content-Type',mime),('Content-Length',str(len(data)))])
    return [data]


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=8000)
    args=parser.parse_args()
    if not (DIST/'index.html').exists(): raise SystemExit('Run npm run build first.')
    with make_server('127.0.0.1',args.port,preview_app) as server:
        print(f'Waypoint preview: http://127.0.0.1:{args.port}',flush=True)
        server.serve_forever()
