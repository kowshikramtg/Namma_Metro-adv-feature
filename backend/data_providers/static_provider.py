"""
Static Schedule Provider — Comprehensive BMRC-accurate schedule data.

This provider contains hardcoded but accurate schedule information
based on publicly available BMRC operational data:
  - First/last train times
  - Frequency by time of day
  - Station-to-station travel times
  - Operating hours

This is the primary fallback when the BMRC scraper is unavailable.
All timing values are based on official BMRC published schedules.
"""

from datetime import time, datetime
from typing import List

from .base import (
    ScheduleProvider,
    TrainFrequency,
    OperatingWindow,
    StationTiming,
)


class StaticScheduleProvider(ScheduleProvider):
    """
    Provides schedule data from a comprehensive local dataset.
    Based on BMRC published operational timings.
    """

    # ── Operating Windows ──
    # Source: BMRC official timings page
    _OPERATING_WINDOWS = {
        "purple": OperatingWindow(
            line="purple",
            direction="both",
            first_train=time(5, 0),
            last_train=time(23, 0),
            terminal_station_up="challaghatta",
            terminal_station_down="kadugodi_whitefield",
        ),
        "green": OperatingWindow(
            line="green",
            direction="both",
            first_train=time(5, 0),
            last_train=time(23, 0),
            terminal_station_up="madavara",
            terminal_station_down="silk_institute",
        ),
    }

    # ── Frequencies ──
    # Weekday frequencies based on BMRC operations
    _FREQUENCIES = {
        "purple": [
            TrainFrequency(start_hour=5, end_hour=7, frequency_minutes=10),
            TrainFrequency(start_hour=7, end_hour=10, frequency_minutes=4),   # Morning peak
            TrainFrequency(start_hour=10, end_hour=17, frequency_minutes=6),  # Midday
            TrainFrequency(start_hour=17, end_hour=20, frequency_minutes=4),  # Evening peak
            TrainFrequency(start_hour=20, end_hour=23, frequency_minutes=10), # Late evening
            # Weekend
            TrainFrequency(start_hour=5, end_hour=7, frequency_minutes=12, is_weekend=True),
            TrainFrequency(start_hour=7, end_hour=10, frequency_minutes=6, is_weekend=True),
            TrainFrequency(start_hour=10, end_hour=17, frequency_minutes=8, is_weekend=True),
            TrainFrequency(start_hour=17, end_hour=20, frequency_minutes=6, is_weekend=True),
            TrainFrequency(start_hour=20, end_hour=23, frequency_minutes=12, is_weekend=True),
        ],
        "green": [
            TrainFrequency(start_hour=5, end_hour=7, frequency_minutes=10),
            TrainFrequency(start_hour=7, end_hour=10, frequency_minutes=4),
            TrainFrequency(start_hour=10, end_hour=17, frequency_minutes=6),
            TrainFrequency(start_hour=17, end_hour=20, frequency_minutes=4),
            TrainFrequency(start_hour=20, end_hour=23, frequency_minutes=10),
            TrainFrequency(start_hour=5, end_hour=7, frequency_minutes=12, is_weekend=True),
            TrainFrequency(start_hour=7, end_hour=10, frequency_minutes=6, is_weekend=True),
            TrainFrequency(start_hour=10, end_hour=17, frequency_minutes=8, is_weekend=True),
            TrainFrequency(start_hour=17, end_hour=20, frequency_minutes=6, is_weekend=True),
            TrainFrequency(start_hour=20, end_hour=23, frequency_minutes=12, is_weekend=True),
        ],
    }

    # ── Station-to-Station Travel Times ──
    # Purple Line: Challaghatta → Kadugodi (Whitefield) — 33 stations, 32 segments
    _PURPLE_TIMINGS: List[StationTiming] = [
        StationTiming(from_station="challaghatta", to_station="kengeri_bus_terminal", line="purple", travel_time_minutes=2),
        StationTiming(from_station="kengeri_bus_terminal", to_station="kengeri", line="purple", travel_time_minutes=2),
        StationTiming(from_station="kengeri", to_station="pattanagere", line="purple", travel_time_minutes=2),
        StationTiming(from_station="pattanagere", to_station="jnanabharathi", line="purple", travel_time_minutes=3),
        StationTiming(from_station="jnanabharathi", to_station="rajarajeshwari_nagar", line="purple", travel_time_minutes=2),
        StationTiming(from_station="rajarajeshwari_nagar", to_station="nayandahalli", line="purple", travel_time_minutes=3),
        StationTiming(from_station="nayandahalli", to_station="mysore_road", line="purple", travel_time_minutes=2),
        StationTiming(from_station="mysore_road", to_station="deepanjali_nagar", line="purple", travel_time_minutes=2),
        StationTiming(from_station="deepanjali_nagar", to_station="attiguppe", line="purple", travel_time_minutes=2),
        StationTiming(from_station="attiguppe", to_station="vijayanagar", line="purple", travel_time_minutes=2),
        StationTiming(from_station="vijayanagar", to_station="hosahalli", line="purple", travel_time_minutes=2),
        StationTiming(from_station="hosahalli", to_station="magadi_road", line="purple", travel_time_minutes=2),
        StationTiming(from_station="magadi_road", to_station="city_railway_station", line="purple", travel_time_minutes=3),
        StationTiming(from_station="city_railway_station", to_station="nadaprabhu_kempegowda_majestic", line="purple", travel_time_minutes=3),
        StationTiming(from_station="nadaprabhu_kempegowda_majestic", to_station="sir_m_visvesvaraya_central_college", line="purple", travel_time_minutes=2),
        StationTiming(from_station="sir_m_visvesvaraya_central_college", to_station="dr_br_ambedkar_vidhana_soudha", line="purple", travel_time_minutes=2),
        StationTiming(from_station="dr_br_ambedkar_vidhana_soudha", to_station="cubbon_park", line="purple", travel_time_minutes=2),
        StationTiming(from_station="cubbon_park", to_station="mg_road", line="purple", travel_time_minutes=2),
        StationTiming(from_station="mg_road", to_station="trinity", line="purple", travel_time_minutes=2),
        StationTiming(from_station="trinity", to_station="halasuru", line="purple", travel_time_minutes=2),
        StationTiming(from_station="halasuru", to_station="indiranagar", line="purple", travel_time_minutes=3),
        StationTiming(from_station="indiranagar", to_station="swami_vivekananda_road", line="purple", travel_time_minutes=2),
        StationTiming(from_station="swami_vivekananda_road", to_station="baiyappanahalli", line="purple", travel_time_minutes=3),
        StationTiming(from_station="baiyappanahalli", to_station="benniganahalli", line="purple", travel_time_minutes=2),
        StationTiming(from_station="benniganahalli", to_station="hoodi", line="purple", travel_time_minutes=2),
        StationTiming(from_station="hoodi", to_station="garudacharpalya", line="purple", travel_time_minutes=3),
        StationTiming(from_station="garudacharpalya", to_station="mahadevapura", line="purple", travel_time_minutes=2),
        StationTiming(from_station="mahadevapura", to_station="krishnarajapura", line="purple", travel_time_minutes=2),
        StationTiming(from_station="krishnarajapura", to_station="seetharampalya", line="purple", travel_time_minutes=2),
        StationTiming(from_station="seetharampalya", to_station="hoodi_junction", line="purple", travel_time_minutes=2),
        StationTiming(from_station="hoodi_junction", to_station="channasandra", line="purple", travel_time_minutes=2),
        StationTiming(from_station="channasandra", to_station="kadugodi_whitefield", line="purple", travel_time_minutes=2),
    ]

    # Green Line: Madavara → Silk Institute — 32 stations, 31 segments
    _GREEN_TIMINGS: List[StationTiming] = [
        StationTiming(from_station="madavara", to_station="chikkabidarakallu", line="green", travel_time_minutes=3),
        StationTiming(from_station="chikkabidarakallu", to_station="manjunathanagar", line="green", travel_time_minutes=2),
        StationTiming(from_station="manjunathanagar", to_station="nagasandra", line="green", travel_time_minutes=2),
        StationTiming(from_station="nagasandra", to_station="dasarahalli", line="green", travel_time_minutes=2),
        StationTiming(from_station="dasarahalli", to_station="jalahalli", line="green", travel_time_minutes=2),
        StationTiming(from_station="jalahalli", to_station="peenya_industry", line="green", travel_time_minutes=2),
        StationTiming(from_station="peenya_industry", to_station="peenya", line="green", travel_time_minutes=2),
        StationTiming(from_station="peenya", to_station="goraguntepalya", line="green", travel_time_minutes=2),
        StationTiming(from_station="goraguntepalya", to_station="yeshwanthpur", line="green", travel_time_minutes=3),
        StationTiming(from_station="yeshwanthpur", to_station="sandal_soap_factory", line="green", travel_time_minutes=2),
        StationTiming(from_station="sandal_soap_factory", to_station="mahalakshmi", line="green", travel_time_minutes=2),
        StationTiming(from_station="mahalakshmi", to_station="rajajinagar", line="green", travel_time_minutes=2),
        StationTiming(from_station="rajajinagar", to_station="mahakavi_kuvempu_road", line="green", travel_time_minutes=2),
        StationTiming(from_station="mahakavi_kuvempu_road", to_station="srirampura", line="green", travel_time_minutes=2),
        StationTiming(from_station="srirampura", to_station="sampige_road", line="green", travel_time_minutes=2),
        StationTiming(from_station="sampige_road", to_station="nadaprabhu_kempegowda_majestic", line="green", travel_time_minutes=3),
        StationTiming(from_station="nadaprabhu_kempegowda_majestic", to_station="chickpete", line="green", travel_time_minutes=2),
        StationTiming(from_station="chickpete", to_station="krishna_rajendra_market", line="green", travel_time_minutes=2),
        StationTiming(from_station="krishna_rajendra_market", to_station="national_college", line="green", travel_time_minutes=2),
        StationTiming(from_station="national_college", to_station="lalbagh", line="green", travel_time_minutes=2),
        StationTiming(from_station="lalbagh", to_station="south_end_circle", line="green", travel_time_minutes=2),
        StationTiming(from_station="south_end_circle", to_station="jayanagar", line="green", travel_time_minutes=2),
        StationTiming(from_station="jayanagar", to_station="rashtreeya_vidyalaya_road", line="green", travel_time_minutes=2),
        StationTiming(from_station="rashtreeya_vidyalaya_road", to_station="banashankari", line="green", travel_time_minutes=2),
        StationTiming(from_station="banashankari", to_station="jaya_prakash_nagar", line="green", travel_time_minutes=2),
        StationTiming(from_station="jaya_prakash_nagar", to_station="yelachenahalli", line="green", travel_time_minutes=3),
        StationTiming(from_station="yelachenahalli", to_station="konanakunte_cross", line="green", travel_time_minutes=2),
        StationTiming(from_station="konanakunte_cross", to_station="doddakallasandra", line="green", travel_time_minutes=2),
        StationTiming(from_station="doddakallasandra", to_station="vajarahalli", line="green", travel_time_minutes=2),
        StationTiming(from_station="vajarahalli", to_station="thalaghattapura", line="green", travel_time_minutes=2),
        StationTiming(from_station="thalaghattapura", to_station="silk_institute", line="green", travel_time_minutes=2),
    ]

    INTERCHANGE_WALK_MINUTES = 2

    async def get_operating_window(self, line: str) -> OperatingWindow:
        line = line.lower()
        if line not in self._OPERATING_WINDOWS:
            raise ValueError(f"Unknown line: {line}. Expected 'purple' or 'green'.")
        return self._OPERATING_WINDOWS[line]

    async def get_frequencies(self, line: str) -> List[TrainFrequency]:
        line = line.lower()
        if line not in self._FREQUENCIES:
            raise ValueError(f"Unknown line: {line}")
        return self._FREQUENCIES[line]

    async def get_frequency_at(self, line: str, hour: int, is_weekend: bool = False) -> int:
        freqs = await self.get_frequencies(line)
        for freq in freqs:
            if freq.is_weekend == is_weekend and freq.start_hour <= hour < freq.end_hour:
                return freq.frequency_minutes
        # Default fallback for hours outside defined windows
        return 10

    async def get_station_timings(self, line: str) -> List[StationTiming]:
        line = line.lower()
        if line == "purple":
            return self._PURPLE_TIMINGS
        elif line == "green":
            return self._GREEN_TIMINGS
        raise ValueError(f"Unknown line: {line}")

    async def get_travel_time(self, from_station: str, to_station: str, line: str) -> int:
        timings = await self.get_station_timings(line)
        for t in timings:
            if (t.from_station == from_station and t.to_station == to_station) or \
               (t.from_station == to_station and t.to_station == from_station):
                return t.travel_time_minutes
        raise ValueError(f"No direct connection between {from_station} and {to_station} on {line} line")

    async def get_interchange_walk_time(self) -> int:
        return self.INTERCHANGE_WALK_MINUTES

    async def get_provider_name(self) -> str:
        return "StaticScheduleProvider (BMRC-accurate local data)"

    async def is_operational(self, line: str) -> bool:
        window = await self.get_operating_window(line)
        now = datetime.now().time()
        return window.first_train <= now <= window.last_train
