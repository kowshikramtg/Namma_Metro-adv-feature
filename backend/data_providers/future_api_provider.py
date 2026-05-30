"""
Future API Provider — Stub for official BMRC real-time API integration.

This provider implements the ScheduleProvider interface but raises
NotImplementedError for all methods. It serves as documentation for
the expected API contract when BMRC publishes an official API.

When an official API becomes available:
  1. Implement the methods in this class
  2. Update provider_factory.py to use this as the primary provider
  3. No changes needed in any consumer code
"""

from datetime import time, datetime
from typing import List

from .base import (
    ScheduleProvider,
    TrainFrequency,
    OperatingWindow,
    StationTiming,
)


class FutureAPIProvider(ScheduleProvider):
    """
    Stub provider for official BMRC real-time API.
    
    Expected API capabilities (when available):
      - Real-time train positions via GPS
      - Live schedule updates and delays
      - Actual crowd/occupancy data from sensors
      - Service disruption notifications
      - Dynamic frequency adjustments
    
    Expected API endpoints (hypothetical):
      GET /api/v1/schedule/{line}
      GET /api/v1/trains/live
      GET /api/v1/stations/{id}/arrivals
      GET /api/v1/disruptions
      WS  /api/v1/stream/positions
    """

    API_BASE_URL = "https://api.bmrc.co.in/v1"  # Hypothetical

    async def get_operating_window(self, line: str) -> OperatingWindow:
        raise NotImplementedError(
            "Official BMRC API not yet available. "
            f"Expected endpoint: GET {self.API_BASE_URL}/schedule/{line}/window"
        )

    async def get_frequencies(self, line: str) -> List[TrainFrequency]:
        raise NotImplementedError(
            "Official BMRC API not yet available. "
            f"Expected endpoint: GET {self.API_BASE_URL}/schedule/{line}/frequencies"
        )

    async def get_frequency_at(self, line: str, hour: int, is_weekend: bool = False) -> int:
        raise NotImplementedError(
            "Official BMRC API not yet available."
        )

    async def get_station_timings(self, line: str) -> List[StationTiming]:
        raise NotImplementedError(
            "Official BMRC API not yet available. "
            f"Expected endpoint: GET {self.API_BASE_URL}/schedule/{line}/timings"
        )

    async def get_travel_time(self, from_station: str, to_station: str, line: str) -> int:
        raise NotImplementedError(
            "Official BMRC API not yet available."
        )

    async def get_interchange_walk_time(self) -> int:
        raise NotImplementedError(
            "Official BMRC API not yet available."
        )

    async def get_provider_name(self) -> str:
        return "FutureAPIProvider (not yet implemented)"

    async def is_operational(self, line: str) -> bool:
        raise NotImplementedError(
            "Official BMRC API not yet available. "
            f"Expected endpoint: GET {self.API_BASE_URL}/status/{line}"
        )
