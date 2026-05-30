"""
Abstract base interface for schedule data providers.

All business logic, schedule engines, and train simulators depend
ONLY on this interface — never on a specific provider implementation.
This ensures the entire system can switch to official BMRC APIs
without changing any consumer code.
"""

from abc import ABC, abstractmethod
from datetime import time
from typing import List, Optional, Dict
from pydantic import BaseModel


class TrainFrequency(BaseModel):
    """Train frequency for a specific time window."""
    start_hour: int          # 0-23
    end_hour: int            # 0-23
    frequency_minutes: int   # Minutes between trains
    is_weekend: bool = False


class OperatingWindow(BaseModel):
    """Operating window for a metro line."""
    line: str                      # "purple" or "green"
    direction: str                 # "up" (towards terminal 1) or "down" (towards terminal 2)
    first_train: time              # First train departure from terminal
    last_train: time               # Last train departure from terminal
    terminal_station_up: str       # Station ID of the up-direction terminal
    terminal_station_down: str     # Station ID of the down-direction terminal


class StationTiming(BaseModel):
    """Travel time between two adjacent stations."""
    from_station: str
    to_station: str
    line: str
    travel_time_minutes: int       # Time between stations (in minutes)
    dwell_time_seconds: int = 30   # Time train stops at station


class ScheduleProvider(ABC):
    """
    Abstract interface for metro schedule data.
    
    Implementations:
      - StaticScheduleProvider: Hardcoded BMRC-accurate schedule data
      - BMRCScraperProvider: Scrapes bmrc.co.in with fallback to static
      - FutureAPIProvider: Stub for official BMRC real-time API
    
    All methods may be async to support network-based providers.
    """

    @abstractmethod
    async def get_operating_window(self, line: str) -> OperatingWindow:
        """Get operating window (first/last train, terminals) for a line."""
        ...

    @abstractmethod
    async def get_frequencies(self, line: str) -> List[TrainFrequency]:
        """Get train frequencies for all time windows on a line."""
        ...

    @abstractmethod
    async def get_frequency_at(self, line: str, hour: int, is_weekend: bool = False) -> int:
        """Get train frequency (minutes) at a specific hour."""
        ...

    @abstractmethod
    async def get_station_timings(self, line: str) -> List[StationTiming]:
        """Get travel times between all adjacent stations on a line."""
        ...

    @abstractmethod
    async def get_travel_time(self, from_station: str, to_station: str, line: str) -> int:
        """Get travel time (minutes) between two adjacent stations."""
        ...

    @abstractmethod
    async def get_interchange_walk_time(self) -> int:
        """Get walking time (minutes) for interchange at Majestic."""
        ...

    @abstractmethod
    async def get_provider_name(self) -> str:
        """Return the name of this provider for diagnostics."""
        ...

    @abstractmethod
    async def is_operational(self, line: str) -> bool:
        """Check if a line is currently operational (within operating hours)."""
        ...
