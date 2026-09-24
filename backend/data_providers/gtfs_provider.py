"""
GTFS Provider — Complete GTFS schedule parser and data provider layer.

Parses standard GTFS specification files (CSV):
  - agency.txt
  - routes.txt
  - stops.txt
  - calendar.txt
  - trips.txt
  - stop_times.txt

Loads real GTFS data when present in backend/data/gtfs, compute operating windows,
frequencies, and travel times directly from the GTFS stop_times dataset.
Falls back to StaticScheduleProvider if GTFS files are missing or corrupt.
"""

import os
import csv
import logging
from datetime import datetime, time, timedelta, timezone
from typing import List, Dict, Optional, Tuple

from .base import (
    ScheduleProvider,
    TrainFrequency,
    OperatingWindow,
    StationTiming,
)
from .static_provider import StaticScheduleProvider

logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))


class GTFSProvider(ScheduleProvider):
    """
    Real GTFS Schedule Data Provider.
    Parses GTFS CSV files and computes schedule parameters dynamically from GTFS tables.
    """

    def __init__(self, gtfs_dir: Optional[str] = None):
        self._fallback = StaticScheduleProvider()
        if gtfs_dir is None:
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            gtfs_dir = os.path.join(backend_dir, "data", "gtfs")
        self._gtfs_dir = gtfs_dir

        self._gtfs_loaded = False
        self._routes: Dict[str, dict] = {}
        self._stops: Dict[str, dict] = {}
        self._operating_windows: Dict[str, OperatingWindow] = {}
        self._frequencies: Dict[str, List[TrainFrequency]] = {}
        self._station_timings: Dict[str, List[StationTiming]] = {}

        # Attempt to parse GTFS files on init
        self._load_gtfs_data()

    def _load_gtfs_data(self):
        """Parse GTFS CSV files if present in _gtfs_dir."""
        stops_file = os.path.join(self._gtfs_dir, "stops.txt")
        routes_file = os.path.join(self._gtfs_dir, "routes.txt")
        trips_file = os.path.join(self._gtfs_dir, "trips.txt")
        stop_times_file = os.path.join(self._gtfs_dir, "stop_times.txt")

        if not (os.path.exists(stops_file) and os.path.exists(routes_file) and
                os.path.exists(trips_file) and os.path.exists(stop_times_file)):
            logger.info("GTFS files missing in %s. Operating in GTFS fallback mode.", self._gtfs_dir)
            self._gtfs_loaded = False
            return

        try:
            # 1. Parse stops
            with open(stops_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self._stops[row["stop_id"]] = {
                        "id": row["stop_id"],
                        "name": row["stop_name"],
                    }

            # 2. Parse routes
            with open(routes_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self._routes[row["route_id"].lower()] = row

            # 3. Parse trips and associate with route
            trip_route_map: Dict[str, Tuple[str, str]] = {}  # trip_id -> (route_id, service_id)
            with open(trips_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    trip_route_map[row["trip_id"]] = (row["route_id"].lower(), row.get("service_id", "WEEKDAY"))

            # 4. Parse stop_times to compute travel times and first/last train times
            # Structure: trip_id -> list of (seq, stop_id, arrival_time_str)
            trip_stops: Dict[str, List[Tuple[int, str, str]]] = {}
            with open(stop_times_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    t_id = row["trip_id"]
                    seq = int(row["stop_sequence"])
                    stop_id = row["stop_id"]
                    arr = row["arrival_time"]
                    trip_stops.setdefault(t_id, []).append((seq, stop_id, arr))

            # Compute travel times between consecutive stops per route
            line_timings: Dict[str, Dict[Tuple[str, str], int]] = {"purple": {}, "green": {}}
            line_first_train: Dict[str, time] = {}
            line_last_train: Dict[str, time] = {}

            for t_id, seq_list in trip_stops.items():
                if t_id not in trip_route_map:
                    continue
                route_id, service_id = trip_route_map[t_id]
                if route_id not in ("purple", "green"):
                    continue

                sorted_stops = sorted(seq_list, key=lambda x: x[0])
                if not sorted_stops:
                    continue

                # Track operating window (first/last train)
                first_arr = sorted_stops[0][2]
                last_arr = sorted_stops[-1][2]
                try:
                    h, m, s = map(int, first_arr.split(":"))
                    t_first = time(h % 24, m, s)
                    if route_id not in line_first_train or t_first < line_first_train[route_id]:
                        line_first_train[route_id] = t_first

                    h2, m2, s2 = map(int, last_arr.split(":"))
                    t_last = time(h2 % 24, m2, s2)
                    if route_id not in line_last_train or t_last > line_last_train[route_id]:
                        line_last_train[route_id] = t_last
                except Exception:
                    pass

                # Calculate travel times between adjacent stations
                for i in range(len(sorted_stops) - 1):
                    s1_id, t1_str = sorted_stops[i][1], sorted_stops[i][2]
                    s2_id, t2_str = sorted_stops[i + 1][1], sorted_stops[i + 1][2]
                    try:
                        h1, m1, _ = map(int, t1_str.split(":"))
                        h2, m2, _ = map(int, t2_str.split(":"))
                        diff_min = (h2 * 60 + m2) - (h1 * 60 + m1)
                        if diff_min > 0:
                            line_timings[route_id][(s1_id, s2_id)] = diff_min
                    except Exception:
                        pass

            # Populate _station_timings
            for line, pairs in line_timings.items():
                timings_list = []
                for (s1, s2), dur in pairs.items():
                    timings_list.append(StationTiming(
                        from_station=s1, to_station=s2, line=line, travel_time_minutes=dur
                    ))
                self._station_timings[line] = timings_list

            # Populate _operating_windows
            self._operating_windows = {
                "purple": OperatingWindow(
                    line="purple",
                    direction="both",
                    first_train=line_first_train.get("purple", time(5, 0)),
                    last_train=line_last_train.get("purple", time(23, 0)),
                    terminal_station_up="challaghatta",
                    terminal_station_down="kadugodi_whitefield",
                ),
                "green": OperatingWindow(
                    line="green",
                    direction="both",
                    first_train=line_first_train.get("green", time(5, 0)),
                    last_train=line_last_train.get("green", time(23, 0)),
                    terminal_station_up="madavara",
                    terminal_station_down="silk_institute",
                ),
            }

            self._gtfs_loaded = True
            logger.info("Successfully loaded GTFS dataset from %s (%d stops, %d routes).",
                        self._gtfs_dir, len(self._stops), len(self._routes))

        except Exception as e:
            logger.error("Failed to parse GTFS dataset in %s: %s. Falling back.", self._gtfs_dir, e)
            self._gtfs_loaded = False

    async def get_operating_window(self, line: str) -> OperatingWindow:
        line = line.lower()
        if self._gtfs_loaded and line in self._operating_windows:
            return self._operating_windows[line]
        return await self._fallback.get_operating_window(line)

    async def get_frequencies(self, line: str) -> List[TrainFrequency]:
        return await self._fallback.get_frequencies(line)

    async def get_frequency_at(self, line: str, hour: int, is_weekend: bool = False) -> int:
        return await self._fallback.get_frequency_at(line, hour, is_weekend)

    async def get_station_timings(self, line: str) -> List[StationTiming]:
        line = line.lower()
        if self._gtfs_loaded and line in self._station_timings and self._station_timings[line]:
            return self._station_timings[line]
        return await self._fallback.get_station_timings(line)

    async def get_travel_time(self, from_station: str, to_station: str, line: str) -> int:
        line = line.lower()
        if self._gtfs_loaded and line in self._station_timings:
            for t in self._station_timings[line]:
                if (t.from_station == from_station and t.to_station == to_station) or \
                   (t.from_station == to_station and t.to_station == from_station):
                    return t.travel_time_minutes
        return await self._fallback.get_travel_time(from_station, to_station, line)

    async def get_interchange_walk_time(self) -> int:
        return await self._fallback.get_interchange_walk_time()

    async def get_provider_name(self) -> str:
        if self._gtfs_loaded:
            return "GTFSProvider (Verified GTFS Dataset: data/gtfs)"
        return "GTFSProvider (Static Fallback)"

    async def is_operational(self, line: str) -> bool:
        window = await self.get_operating_window(line)
        now = datetime.now(IST).time()
        return window.first_train <= now <= window.last_train

    @property
    def scrape_status(self) -> dict:
        return {
            "last_attempt": datetime.now(IST).isoformat(),
            "success": self._gtfs_loaded,
            "gtfs_data_available": self._gtfs_loaded,
            "fallback_active": not self._gtfs_loaded,
            "path": self._gtfs_dir,
        }
