"""
Integration tests for FastAPI endpoints in main.py.
"""

import pytest
import sys
import os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app

client = TestClient(app)


def test_root_endpoint():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "operational"


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"


def test_list_stations():
    res = client.get("/api/stations")
    assert res.status_code == 200
    data = res.json()
    assert len(data["stations"]) == 64


def test_journey_plan():
    res = client.post("/api/journey/plan", json={
        "source": "challaghatta",
        "destination": "mg_road"
    })
    assert res.status_code == 200
    data = res.json()
    assert "route" in data
    assert "next_trains" in data


def test_ticket_purchase_and_tracking():
    # Purchase ticket
    res = client.post("/api/ticket/purchase", json={
        "source": "challaghatta",
        "destination": "mg_road",
        "passengers": 2
    })
    assert res.status_code == 200
    ticket = res.json()
    assert "ticket_id" in ticket
    journey_id = ticket["journey_id"]

    # Get journey status
    j_res = client.get(f"/api/journey/{journey_id}")
    assert j_res.status_code == 200
    j_data = j_res.json()
    assert "live_status" in j_data
    assert "instructions" in j_data


def test_websocket_journey_tracking():
    # Purchase ticket
    res = client.post("/api/ticket/purchase", json={
        "source": "challaghatta",
        "destination": "mg_road",
        "passengers": 1
    })
    journey_id = res.json()["journey_id"]

    # Connect WebSocket
    with client.websocket_connect(f"/ws/journey/{journey_id}") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "journey_update"
        assert "live_status" in data
        assert "instructions" in data
