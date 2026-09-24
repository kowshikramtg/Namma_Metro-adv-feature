"""
Tests for services.schedule_engine — Journey timing & next train arrival engine.
"""

import pytest
import sys
import os
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data.stations import find_route
from data_providers.static_provider import StaticScheduleProvider
from services.schedule_engine import ScheduleEngine, IST


@pytest.fixture
def schedule_engine():
    provider = StaticScheduleProvider()
    return ScheduleEngine(provider)


@pytest.mark.asyncio
async def test_compute_journey_times_purple_line(schedule_engine):
    route = find_route("challaghatta", "mg_road")
    assert route is not None
    enriched = await schedule_engine.compute_journey_times(route.segments)

    assert len(enriched) == 1
    seg = enriched[0]
    assert "departure_time" in seg
    assert "arrival_time" in seg
    assert "departure_iso" in seg
    assert "arrival_iso" in seg
    assert seg["travel_time_minutes"] > 0


@pytest.mark.asyncio
async def test_compute_journey_times_interchange(schedule_engine):
    route = find_route("mg_road", "rajajinagar")
    assert route is not None
    enriched = await schedule_engine.compute_journey_times(route.segments)

    assert len(enriched) == 2
    # Check that second segment departure accounts for walk time + frequency alignment
    arr_seg1 = datetime.fromisoformat(enriched[0]["arrival_iso"])
    dep_seg2 = datetime.fromisoformat(enriched[1]["departure_iso"])
    assert dep_seg2 >= arr_seg1 + timedelta(minutes=2)


@pytest.mark.asyncio
async def test_get_next_trains_regular_hours(schedule_engine):
    trains = await schedule_engine.get_next_trains("mg_road", "purple", count=3)
    assert len(trains) > 0
    for t in trains:
        assert t["line"] == "purple"
        assert t["status"] in ("Arriving", "On Time")
        assert "arrival_time" in t


@pytest.mark.asyncio
async def test_get_live_status(schedule_engine):
    route = find_route("challaghatta", "mg_road")
    assert route is not None
    enriched = await schedule_engine.compute_journey_times(route.segments)

    # Test status right at start
    now = datetime.now(IST)
    status = await schedule_engine.get_live_status(now, enriched)
    assert status["status"] in ("boarding", "in_progress")
    assert status["progress"] >= 0.0

    # Test status after full completion time
    past_start = now - timedelta(hours=2)
    completed_status = await schedule_engine.get_live_status(past_start, enriched)
    assert completed_status["status"] == "completed"
    assert completed_status["progress"] == 1.0
