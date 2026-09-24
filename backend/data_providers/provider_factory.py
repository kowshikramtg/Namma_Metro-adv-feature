"""
Provider Factory — Creates and manages the schedule data provider chain.

Priority order:
  1. GTFSProvider (attempts live data, falls back internally)
  2. StaticScheduleProvider (always available)
  3. FutureAPIProvider (not yet functional)

The factory ensures the application always has a working provider.
"""

import logging
from typing import Optional

from .base import ScheduleProvider
from .static_provider import StaticScheduleProvider
from .gtfs_provider import GTFSProvider
from .future_api_provider import FutureAPIProvider

logger = logging.getLogger(__name__)

# Singleton provider instance
_provider_instance: Optional[ScheduleProvider] = None


def get_schedule_provider(provider_type: str = "auto") -> ScheduleProvider:
    """
    Get a schedule provider instance.
    
    Args:
        provider_type: One of "auto", "static", "gtfs", "future"
          - "auto": Uses GTFSProvider (which falls back to static internally)
          - "static": Uses StaticScheduleProvider directly
          - "gtfs": Uses GTFSProvider
          - "future": Uses FutureAPIProvider (will raise NotImplementedError)
    
    Returns:
        A ScheduleProvider instance.
    """
    global _provider_instance

    if provider_type == "static":
        _provider_instance = StaticScheduleProvider()
        logger.info("Using StaticScheduleProvider")
    elif provider_type == "gtfs":
        _provider_instance = GTFSProvider()
        logger.info("Using GTFSProvider")
    elif provider_type == "future":
        _provider_instance = FutureAPIProvider()
        logger.info("Using FutureAPIProvider (NOT FUNCTIONAL)")
    else:
        # Default: use GTFS scraper which has built-in fallback
        _provider_instance = GTFSProvider()
        logger.info("Using GTFSProvider (auto mode with static fallback)")

    return _provider_instance


def get_current_provider() -> ScheduleProvider:
    """Get the current provider instance, creating one if needed."""
    global _provider_instance
    if _provider_instance is None:
        return get_schedule_provider("auto")
    return _provider_instance
