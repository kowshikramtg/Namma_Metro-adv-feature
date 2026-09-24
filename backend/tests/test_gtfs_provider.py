"""
Tests for GTFSProvider dataset parsing and schedule interface.
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data_providers.gtfs_provider import GTFSProvider


@pytest.fixture
def gtfs_provider():
    return GTFSProvider()


@pytest.mark.asyncio
async def test_gtfs_provider_loaded(gtfs_provider):
    name = await gtfs_provider.get_provider_name()
    assert "GTFSProvider" in name
    assert gtfs_provider._gtfs_loaded is True


@pytest.mark.asyncio
async def test_gtfs_operating_window(gtfs_provider):
    window = await gtfs_provider.get_operating_window("purple")
    assert window.line == "purple"
    assert window.first_train is not None
    assert window.last_train is not None


@pytest.mark.asyncio
async def test_gtfs_travel_time(gtfs_provider):
    travel_time = await gtfs_provider.get_travel_time("challaghatta", "kengeri_bus_terminal", "purple")
    assert travel_time == 2
