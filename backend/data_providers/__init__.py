"""
Data providers for Namma Metro schedule and operational data.

Architecture:
  ScheduleProvider (abstract interface)
  ├── GTFSProvider  — scrapes gtfs.co.in (with graceful fallback)
  ├── StaticScheduleProvider — comprehensive local schedule data
  └── FutureAPIProvider — stub for official GTFS API integration

Business logic depends ONLY on the ScheduleProvider interface.
"""

from .base import ScheduleProvider, TrainFrequency, OperatingWindow, StationTiming
from .static_provider import StaticScheduleProvider
from .gtfs_provider import GTFSProvider
from .future_api_provider import FutureAPIProvider
from .provider_factory import get_schedule_provider

__all__ = [
    "ScheduleProvider",
    "TrainFrequency",
    "OperatingWindow",
    "StationTiming",
    "StaticScheduleProvider",
    "GTFSProvider",
    "FutureAPIProvider",
    "get_schedule_provider",
]
