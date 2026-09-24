"""
Tests for services.alert_engine — Contextual alert generation engine.
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.alert_engine import AlertEngine


def test_generate_boarding_alert():
    status = {"status": "boarding", "current_segment": 0, "segment_progress": 0.0}
    segments = [{
        "from_station": "Challaghatta",
        "to_station": "MG Road",
        "line": "purple",
    }]
    alerts = AlertEngine.generate_alerts(status, segments)
    assert len(alerts) == 1
    assert alerts[0]["type"] == "board_train"
    assert "Purple" in alerts[0]["message"]


def test_generate_approaching_interchange_alert():
    status = {"status": "approaching_interchange", "current_segment": 0, "segment_progress": 0.9}
    segments = [
        {"from_station": "MG Road", "to_station": "Majestic", "line": "purple"},
        {"from_station": "Majestic", "to_station": "Rajajinagar", "line": "green"},
    ]
    alerts = AlertEngine.generate_alerts(status, segments)
    assert len(alerts) == 1
    assert alerts[0]["type"] == "prepare_interchange"
    assert "Majestic" in alerts[0]["message"]


def test_generate_completed_alert():
    status = {"status": "completed", "current_segment": 0, "segment_progress": 1.0}
    segments = [{"from_station": "Challaghatta", "to_station": "MG Road", "line": "purple"}]
    alerts = AlertEngine.generate_alerts(status, segments)
    assert len(alerts) == 1
    assert alerts[0]["type"] == "reached_destination"
