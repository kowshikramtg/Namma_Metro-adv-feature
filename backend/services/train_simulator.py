"""
Train Simulator — Computes train positions from schedule data.

This engine determines where every active train is at any given moment
by computing forward from the timetable. No random positions, no timer-based
fake movement, no manually animated trains.

Inputs (from ScheduleProvider):
  - Station graph with travel durations
  - Train frequencies per time of day
  - Operating windows (first/last train)

Outputs:
  - Positions of all active trains
  - Next arrival at any station
  - Train timetable for a line

Architecture supports replacement with real GTFS or GPS feeds.
"""

from datetime import datetime, timedelta, time as dtime
from typing import List, Dict, Optional
from pydantic import BaseModel

from data_providers.base import ScheduleProvider
from data.stations import (
    PURPLE_LINE_STATIONS,
    GREEN_LINE_STATIONS,
    PURPLE_LINE_TIMES,
    GREEN_LINE_TIMES,
)


class TrainPosition(BaseModel):
    """Position of a single train at a point in time."""
    train_id: str
    line: str
    direction: str               # "up" or "down"
    departure_terminal: str      # Station ID of departure terminal
    destination_terminal: str    # Station ID of destination terminal
    current_station_id: str      # Station the train is at or just passed
    current_station_name: str
    next_station_id: Optional[str] = None
    next_station_name: Optional[str] = None
    progress_to_next: float      # 0.0 = at current, 1.0 = at next
    departed_at: str             # ISO time when train departed terminal
    status: str                  # "at_station", "in_transit", "terminated"


class TrainSimulator:
    """
    Computes train positions from schedule data.
    All positions are mathematically derived — never random.
    """

    def __init__(self, provider: ScheduleProvider):
        self._provider = provider

    def _get_line_stations(self, line: str, direction: str) -> List[tuple]:
        """Get ordered station list for a line+direction."""
        if line == "purple":
            stations = list(PURPLE_LINE_STATIONS)
            times = list(PURPLE_LINE_TIMES)
        else:
            stations = list(GREEN_LINE_STATIONS)
            times = list(GREEN_LINE_TIMES)

        if direction == "up":
            stations = list(reversed(stations))
            times = list(reversed(times))

        return stations, times

    async def _generate_departure_times(
        self,
        line: str,
        direction: str,
        target_date: datetime,
    ) -> List[datetime]:
        """
        Generate all train departure times for a line on a given date.
        Based on operating window and frequency schedule.
        """
        window = await self._provider.get_operating_window(line)
        is_weekend = target_date.weekday() >= 5

        departures = []
        current = datetime.combine(target_date.date(), window.first_train)
        end = datetime.combine(target_date.date(), window.last_train)

        while current <= end:
            departures.append(current)
            freq = await self._provider.get_frequency_at(
                line, current.hour, is_weekend
            )
            current = current + timedelta(minutes=freq)

        return departures

    async def _compute_station_arrival_offsets(
        self,
        line: str,
        direction: str,
    ) -> List[tuple]:
        """
        Compute cumulative time from terminal to each station.
        Returns: [(station_id, station_name, cumulative_minutes)]
        """
        stations, times = self._get_line_stations(line, direction)
        offsets = [(stations[0][0], stations[0][1], 0)]

        cumulative = 0
        for i in range(len(times)):
            if i < len(stations) - 1:
                cumulative += times[i]
                offsets.append((stations[i + 1][0], stations[i + 1][1], cumulative))

        return offsets

    async def compute_train_position(
        self,
        departure_time: datetime,
        line: str,
        direction: str,
        at_time: datetime,
    ) -> Optional[TrainPosition]:
        """
        Compute position of a single train at a specific time.
        """
        offsets = await self._compute_station_arrival_offsets(line, direction)
        elapsed = (at_time - departure_time).total_seconds() / 60

        if elapsed < 0:
            return None  # Train hasn't departed yet

        total_journey_time = offsets[-1][2]
        if elapsed > total_journey_time:
            return None  # Train has completed its journey

        # Find which segment the train is in
        for i in range(len(offsets) - 1):
            curr_id, curr_name, curr_offset = offsets[i]
            next_id, next_name, next_offset = offsets[i + 1]

            if curr_offset <= elapsed <= next_offset:
                seg_duration = next_offset - curr_offset
                if seg_duration > 0:
                    progress = (elapsed - curr_offset) / seg_duration
                else:
                    progress = 0.0

                # Determine if at station (within 0.5 min dwell) or in transit
                if progress < 0.05:
                    status = "at_station"
                elif progress > 0.95:
                    status = "at_station"
                else:
                    status = "in_transit"

                stations_list, _ = self._get_line_stations(line, direction)
                dest_station = stations_list[-1]

                return TrainPosition(
                    train_id=f"{line[0].upper()}L-{departure_time.strftime('%H%M')}-{direction[0].upper()}",
                    line=line,
                    direction=direction,
                    departure_terminal=stations_list[0][0],
                    destination_terminal=dest_station[0],
                    current_station_id=curr_id,
                    current_station_name=curr_name,
                    next_station_id=next_id,
                    next_station_name=next_name,
                    progress_to_next=round(progress, 3),
                    departed_at=departure_time.isoformat(),
                    status=status,
                )

        return None

    async def compute_all_positions(
        self,
        at_time: Optional[datetime] = None,
    ) -> List[TrainPosition]:
        """
        Compute positions of ALL active trains at the given time.
        """
        if at_time is None:
            at_time = datetime.now()

        positions = []

        for line in ["purple", "green"]:
            for direction in ["down", "up"]:
                departures = await self._generate_departure_times(
                    line, direction, at_time
                )

                for dep_time in departures:
                    pos = await self.compute_train_position(
                        dep_time, line, direction, at_time
                    )
                    if pos:
                        positions.append(pos)

        return positions

    async def get_next_arrival(
        self,
        station_id: str,
        line: str,
        direction: str = "down",
        after: Optional[datetime] = None,
    ) -> Optional[Dict]:
        """
        Compute the next train arrival at a specific station.
        """
        if after is None:
            after = datetime.now()

        offsets = await self._compute_station_arrival_offsets(line, direction)

        # Find the station's offset from terminal
        station_offset = None
        station_name = None
        for sid, sname, offset in offsets:
            if sid == station_id:
                station_offset = offset
                station_name = sname
                break

        if station_offset is None:
            return None

        # Check each departure to find the next train arriving at this station
        departures = await self._generate_departure_times(line, direction, after)

        for dep_time in departures:
            arrival_at_station = dep_time + timedelta(minutes=station_offset)
            if arrival_at_station > after:
                minutes_away = int((arrival_at_station - after).total_seconds() / 60)
                stations_list, _ = self._get_line_stations(line, direction)
                dest = stations_list[-1]

                return {
                    "train_id": f"{line[0].upper()}L-{dep_time.strftime('%H%M')}-{direction[0].upper()}",
                    "line": line,
                    "direction": direction,
                    "station_id": station_id,
                    "station_name": station_name,
                    "arrival_time": arrival_at_station.strftime("%I:%M %p"),
                    "arrival_iso": arrival_at_station.isoformat(),
                    "minutes_away": minutes_away,
                    "destination": dest[1],
                    "status": "Arriving" if minutes_away <= 1 else "On Time",
                }

        return None
