def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["backend"] == "Django"
    assert response.headers["X-Content-Type-Options"] == "nosniff"


def test_health_rejects_post(client):
    assert client.post("/api/health").status_code == 405
