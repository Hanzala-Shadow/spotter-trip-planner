"""Vercel /api/plan adapter for the shared Django application."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from config.wsgi import application


def app(environ, start_response):
    environ["PATH_INFO"] = "/api/plan"
    return application(environ, start_response)
