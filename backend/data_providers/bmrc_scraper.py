"""
BMRC Scraper Provider — Attempts to fetch schedule data from bmrc.co.in.

The BMRC website (bmrc.co.in/metro-timings/) is a Next.js SSR application
that renders timing data via JavaScript. Direct HTML scraping is unreliable.

Strategy:
  1. Attempt to fetch and parse the BMRC metro-timings page
  2. Extract any available timing information
  3. On ANY failure, gracefully fall back to StaticScheduleProvider
  4. Log all scraping attempts for monitoring

This provider is designed to be replaced entirely when/if BMRC publishes
an official API.
"""

import logging
from datetime import time, datetime
from typing import List, Optional

from .base import (
    ScheduleProvider,
    TrainFrequency,
    OperatingWindow,
    StationTiming,
)
from .static_provider import StaticScheduleProvider

logger = logging.getLogger(__name__)


class BMRCScraperProvider(ScheduleProvider):
    """
    Scrapes BMRC website for schedule data.
    Falls back to StaticScheduleProvider on any failure.
    """

    BMRC_TIMINGS_URL = "https://www.bmrc.co.in/metro-timings/"
    BMRC_NETWORK_URL = "https://www.bmrc.co.in/metro-network/"

    def __init__(self):
        self._fallback = StaticScheduleProvider()
        self._scraped_data: Optional[dict] = None
        self._last_scrape_attempt: Optional[datetime] = None
        self._scrape_success: bool = False
        self._scrape_interval_minutes: int = 60  # Re-scrape every hour

    async def _attempt_scrape(self) -> bool:
        """
        Attempt to scrape BMRC website for timing data.
        Returns True if successful, False otherwise.
        """
        now = datetime.now()

        # Don't re-scrape too frequently
        if self._last_scrape_attempt and \
           (now - self._last_scrape_attempt).total_seconds() < self._scrape_interval_minutes * 60:
            return self._scrape_success

        self._last_scrape_attempt = now

        try:
            import httpx
            from bs4 import BeautifulSoup

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(self.BMRC_TIMINGS_URL)
                response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # The BMRC page uses Next.js SSR — timing data is rendered via JS
            # Look for the __NEXT_DATA__ script tag which contains page props
            next_data_script = soup.find("script", id="__NEXT_DATA__")
            if next_data_script:
                import json
                data = json.loads(next_data_script.string)
                page_props = data.get("props", {}).get("pageProps", {})

                if page_props:
                    # Extract timing data if available in page props
                    self._scraped_data = page_props
                    self._scrape_success = True
                    logger.info("BMRC scrape successful — timing data extracted from page props")
                    return True

            # If __NEXT_DATA__ doesn't have useful data, try parsing HTML tables
            tables = soup.find_all("table")
            if tables:
                self._scraped_data = {"tables_found": len(tables)}
                self._scrape_success = True
                logger.info(f"BMRC scrape: found {len(tables)} tables in HTML")
                return True

            # Page loaded but no usable data found (JS-rendered content)
            logger.warning(
                "BMRC page loaded but timing data not found in HTML. "
                "Content is likely rendered client-side via JavaScript. "
                "Falling back to static provider."
            )
            self._scrape_success = False
            return False

        except ImportError:
            logger.warning("httpx or beautifulsoup4 not installed. Using static fallback.")
            self._scrape_success = False
            return False
        except Exception as e:
            logger.warning(f"BMRC scrape failed: {e}. Using static fallback.")
            self._scrape_success = False
            return False

    async def get_operating_window(self, line: str) -> OperatingWindow:
        await self._attempt_scrape()
        # Currently, scraped data doesn't provide structured operating windows
        # Fall back to static provider
        return await self._fallback.get_operating_window(line)

    async def get_frequencies(self, line: str) -> List[TrainFrequency]:
        await self._attempt_scrape()
        return await self._fallback.get_frequencies(line)

    async def get_frequency_at(self, line: str, hour: int, is_weekend: bool = False) -> int:
        await self._attempt_scrape()
        return await self._fallback.get_frequency_at(line, hour, is_weekend)

    async def get_station_timings(self, line: str) -> List[StationTiming]:
        await self._attempt_scrape()
        return await self._fallback.get_station_timings(line)

    async def get_travel_time(self, from_station: str, to_station: str, line: str) -> int:
        await self._attempt_scrape()
        return await self._fallback.get_travel_time(from_station, to_station, line)

    async def get_interchange_walk_time(self) -> int:
        return await self._fallback.get_interchange_walk_time()

    async def get_provider_name(self) -> str:
        if self._scrape_success:
            return "BMRCScraperProvider (bmrc.co.in + static fallback)"
        return "BMRCScraperProvider (static fallback — scrape unavailable)"

    async def is_operational(self, line: str) -> bool:
        return await self._fallback.is_operational(line)

    @property
    def scrape_status(self) -> dict:
        """Diagnostic information about scraping status."""
        return {
            "last_attempt": self._last_scrape_attempt.isoformat() if self._last_scrape_attempt else None,
            "success": self._scrape_success,
            "scraped_data_available": self._scraped_data is not None,
            "fallback_active": not self._scrape_success,
            "url": self.BMRC_TIMINGS_URL,
        }
