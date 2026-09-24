"""
Tests for services.train_simulator — Mathematical train position engine.
"""

import pytest
import sys
import os
from datetime import datetime, time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data_providers.static_provider import StaticScheduleProvider
from services.train_simulator import TrainSimulator
from services.schedule_engine import IST


@pytest.fixture
def simulator():
    provider = StaticScheduleProvider()
    return TrainSimulator(provider)


@pytest.mark.asyncio
async def test_compute_all_positions(simulator):
    now = datetime.now(IST)
    positions = await simulator.compute_all_positions(now)
    # Check that positions list returns active trains during operating hours or empty outside
    assert isinstance(positions, list)
    for pos in positions:
        assert 0.0 <= pos.progress_to_next <= 1.0
        assert pos.status in ("at_station", "in_transit")


@pytest.mark.asyncio
async def test_get_next_arrival(simulator):
    now = datetime.now(IST)
    arrival = await simulator.get_next_arrival("mg_road", "purple", "down", after=now)
    if arrival:
        assert arrival["station_id"] == "mg_road"
        assert arrival["line"] == "purple"
        assert "arrival_time" in arrival
