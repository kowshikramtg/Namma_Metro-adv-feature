"""
Schedule Engine — Computes journey times and enriches route segments.

Consumes the ScheduleProvider interface for all timing data.
Does NOT hardcode frequencies or train positions.
"""

from datetime import datetime, timedelta, timezone
IST = timezone(timedelta(hours=5, minutes=30))
from typing import List, Dict, Optional

from data_providers.base import ScheduleProvider


class ScheduleEngine:
    """
    Enriches journey segments with computed departure/arrival times
    based on schedule data from the provider.
    """

    def __init__(self, provider: ScheduleProvider):
        self._provider = provider

    async def compute_journey_times(
        self,
        segments: list,
        base_time: Optional[datetime] = None,
    ) -> List[dict]:
        """
        Add departure/arrival times to journey segments.
        Computes from schedule frequencies — no random values.
        """
        if base_time is None:
            base_time = datetime.now(IST)

        is_weekend = base_time.weekday() >= 5
        current_time = base_time

        enriched = []
        for i, seg in enumerate(segments):
            seg_dict = seg.dict() if hasattr(seg, "dict") else dict(seg)
            line = seg_dict.get("line", "purple")

            # Get frequency for this time
            freq = await self._provider.get_frequency_at(
                line, current_time.hour, is_weekend
            )

            # Align to next train departure
            mins_past = current_time.minute % freq
            if mins_past != 0:
                wait = freq - mins_past
                current_time = current_time + timedelta(minutes=wait)
            # Zero out seconds for clean times
            current_time = current_time.replace(second=0, microsecond=0)

            seg_dict["departure_time"] = current_time.strftime("%I:%M %p")
            seg_dict["departure_iso"] = current_time.isoformat()

            travel = seg_dict.get("travel_time_minutes", 10)
            arrival = current_time + timedelta(minutes=travel)

            seg_dict["arrival_time"] = arrival.strftime("%I:%M %p")
            seg_dict["arrival_iso"] = arrival.isoformat()
            seg_dict["frequency_minutes"] = freq

            enriched.append(seg_dict)

            # If there's a next segment (interchange), add walk time + wait
            if i < len(segments) - 1:
                walk_time = await self._provider.get_interchange_walk_time()
                current_time = arrival + timedelta(minutes=walk_time)
                # Next segment's loop iteration will align to frequency

        return enriched

    async def get_next_trains(
        self,
        station_id: str,
        line: str,
        count: int = 3,
    ) -> List[Dict]:
        """
        Get next N train arrivals at a station.
        Computed from schedule — no random delays or fake positions.
        """
        now = datetime.now(IST)
        is_weekend = now.weekday() >= 5
        freq = await self._provider.get_frequency_at(line, now.hour, is_weekend)
        window = await self._provider.get_operating_window(line)

        # Ensure within operating hours
        if now.time() > window.last_train:
            return []

        # Align to frequency slots measured from first_train of the day.
        # This keeps train times consistent with the train simulator.
        first_train_dt = datetime.combine(now.date(), window.first_train, tzinfo=IST)
        elapsed_since_first = (now - first_train_dt).total_seconds() / 60

        if elapsed_since_first < 0:
            # Before first train — next departure is first_train itself
            slots_ahead = 0
        else:
            # How many full frequency-slots have passed?
            slots_passed = int(elapsed_since_first / freq)
            # Start from the NEXT slot (add +1 to exclude trains already departed)
            slots_ahead = slots_passed + 1

        next_time = first_train_dt + timedelta(minutes=slots_ahead * freq)

        # Terminal destinations based on line
        if line == "purple":
            destinations = [("Kadugodi (Whitefield)", "down"), ("Challaghatta", "up")]
        else:
            destinations = [("Silk Institute", "down"), ("Madavara", "up")]

        trains = []
        for i in range(count):
            train_time = next_time + timedelta(minutes=i * freq)

            if train_time.time() > window.last_train:
                break

            minutes_away = max(0, int((train_time - now).total_seconds() / 60))

            for dir_idx, (dest, direction) in enumerate(destinations):
                train_id = f"{line[0].upper()}L-{train_time.strftime('%H%M')}-{direction[0].upper()}"

                trains.append({
                    "train_id": train_id,
                    "line": line,
                    "direction": direction,
                    "arrival_time": train_time.strftime("%I:%M %p"),
                    "arrival_iso": train_time.isoformat(),
                    "minutes_away": minutes_away,
                    "destination": dest,
                    "status": "Arriving" if minutes_away <= 1 else "On Time",
                    "platform": 1 if dir_idx == 0 else 2,
                    "coaches": 6,
                })

        # Sort by arrival_iso and return
        trains.sort(key=lambda t: t["arrival_iso"])
        return trains[:count * 2]

    async def get_live_status(
        self,
        journey_start_time: datetime,
        segments: list,
    ) -> Dict:
        """
        Get live journey status based on elapsed time since journey start.
        Computed mathematically from segment travel times.
        """
        now = datetime.now(IST)
        elapsed = (now - journey_start_time).total_seconds() / 60

        total_time = sum(s.get("travel_time_minutes", 0) for s in segments)
        # Add interchange time
        interchange_time = 0
        if len(segments) > 1:
            interchange_time = (len(segments) - 1) * (
                await self._provider.get_interchange_walk_time()
            )
        total_with_interchange = total_time + interchange_time
        progress = min(elapsed / max(total_with_interchange, 1), 1.0)

        # Determine current segment and position within it
        cumulative = 0.0
        current_seg = 0
        seg_progress = 0.0

        for i, seg in enumerate(segments):
            seg_time = seg.get("travel_time_minutes", 0)
            # Add interchange wait before this segment (except first)
            if i > 0:
                cumulative += await self._provider.get_interchange_walk_time()

            if cumulative + seg_time > elapsed:
                current_seg = i
                seg_progress = (elapsed - cumulative) / max(seg_time, 1)
                seg_progress = max(0.0, min(1.0, seg_progress))
                break
            cumulative += seg_time
            current_seg = i
            seg_progress = 1.0

        # Determine current station
        current_station = "Journey Complete"
        next_station = None
        if segments and current_seg < len(segments):
            stations = segments[current_seg].get("stations", [])
            if stations:
                station_idx = int(seg_progress * (len(stations) - 1))
                station_idx = min(station_idx, len(stations) - 1)
                current_station = stations[station_idx]
                if station_idx + 1 < len(stations):
                    next_station = stations[station_idx + 1]

        # Status determination
        if progress >= 1.0:
            status = "completed"
        elif progress < 0.02:
            status = "boarding"
        elif seg_progress > 0.85 and current_seg < len(segments) - 1:
            status = "approaching_interchange"
        elif seg_progress > 0.9 and current_seg == len(segments) - 1:
            status = "approaching_destination"
        else:
            status = "in_progress"

        return {
            "progress": round(progress, 3),
            "current_segment": current_seg,
            "segment_progress": round(seg_progress, 3),
            "current_station": current_station,
            "next_station": next_station,
            "elapsed_minutes": round(elapsed, 1),
            "remaining_minutes": round(max(total_with_interchange - elapsed, 0), 1),
            "status": status,
            "total_segments": len(segments),
        }
