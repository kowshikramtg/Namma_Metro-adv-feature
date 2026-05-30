"""
Instruction Engine — Generates ordered, step-by-step passenger instructions.

Replaces generic route rendering with precise journey stages.
ETAs are strictly derived from schedule times, travel duration, and interchanges.
"""

from enum import Enum
from typing import List, Dict, Optional
from datetime import datetime, timedelta

class InstructionStage(str, Enum):
    WAITING_FIRST_TRAIN = "WAITING_FIRST_TRAIN"
    BOARD_FIRST_TRAIN = "BOARD_FIRST_TRAIN"
    IN_FIRST_TRAIN = "IN_FIRST_TRAIN"
    APPROACHING_INTERCHANGE = "APPROACHING_INTERCHANGE"
    DEBOARD_INTERCHANGE = "DEBOARD_INTERCHANGE"
    WALK_TO_PLATFORM = "WALK_TO_PLATFORM"
    WAITING_CONNECTING_TRAIN = "WAITING_CONNECTING_TRAIN"
    BOARD_CONNECTING_TRAIN = "BOARD_CONNECTING_TRAIN"
    IN_CONNECTING_TRAIN = "IN_CONNECTING_TRAIN"
    APPROACHING_DESTINATION = "APPROACHING_DESTINATION"
    DEBOARD_DESTINATION = "DEBOARD_DESTINATION"
    ARRIVED = "ARRIVED"


class InstructionEngine:
    @staticmethod
    def generate_instructions(
        segments: List[Dict],
        live_status: Dict,
        start_time: datetime,
        interchange_time: int = 2,
        next_trains: Optional[List[Dict]] = None
    ) -> List[Dict]:
        """
        Generate complete list of instructions for the journey.
        Determines the single active instruction based on live_status.
        """
        if not segments:
            return []

        instructions = []
        is_multi_line = len(segments) > 1
        current_time = start_time

        # -- Segment 1 --
        seg1 = segments[0]
        line1 = seg1.get("line", "purple").title()
        dir1 = seg1.get("to_station", "Destination")
        
        try:
            dep_iso_1 = datetime.fromisoformat(seg1.get("departure_iso", current_time.isoformat()))
        except Exception:
            dep_iso_1 = current_time

        wait_mins_1 = max(0, int((dep_iso_1 - current_time).total_seconds() / 60))
        
        platform1 = None
        if next_trains:
            for t in next_trains:
                if t.get("line") == line1.lower() and t.get("destination") == dir1:
                    platform1 = t.get("platform")
                    break

        inst1 = {
            "stage": InstructionStage.WAITING_FIRST_TRAIN.value,
            "title": f"Wait for {line1} Line Train",
            "description": f"Next train towards {dir1} arriving soon.",
            "eta_minutes": wait_mins_1,
            "scheduled_time": dep_iso_1.isoformat(),
            "line": line1,
            "direction": dir1,
            "station": seg1.get("from_station", ""),
        }
        if platform1:
            inst1["platform"] = platform1
        instructions.append(inst1)

        inst2 = {
            "stage": InstructionStage.BOARD_FIRST_TRAIN.value,
            "title": f"Board {line1} Line Train",
            "description": f"Please allow passengers to de-board first.",
            "eta_minutes": wait_mins_1,
            "scheduled_time": dep_iso_1.isoformat(),
            "line": line1,
            "direction": dir1,
            "station": seg1.get("from_station", ""),
        }
        if platform1:
            inst2["platform"] = platform1
        instructions.append(inst2)

        travel_time_1 = seg1.get("travel_time_minutes", 0)
        arr_iso_1 = dep_iso_1 + timedelta(minutes=travel_time_1)

        instructions.append({
            "stage": InstructionStage.IN_FIRST_TRAIN.value,
            "title": f"Traveling on {line1} Line",
            "description": f"{seg1.get('stations_count', len(seg1.get('stations', [])))} stations to go.",
            "eta_minutes": travel_time_1,
            "scheduled_time": arr_iso_1.isoformat(),
            "line": line1,
            "direction": dir1,
            "station": "In Transit",
        })

        if is_multi_line:
            interchange_stn = seg1.get("to_station", "Majestic")
            instructions.append({
                "stage": InstructionStage.APPROACHING_INTERCHANGE.value,
                "title": f"Approaching Interchange: {interchange_stn}",
                "description": "Prepare to de-board with your belongings.",
                "eta_minutes": 1,
                "scheduled_time": arr_iso_1.isoformat(),
                "line": line1,
                "direction": dir1,
                "station": interchange_stn,
            })
            instructions.append({
                "stage": InstructionStage.DEBOARD_INTERCHANGE.value,
                "title": f"De-board at {interchange_stn}",
                "description": "Follow signs for line transfer.",
                "eta_minutes": 0,
                "scheduled_time": arr_iso_1.isoformat(),
                "line": line1,
                "direction": dir1,
                "station": interchange_stn,
            })

            # -- Interchange --
            seg2 = segments[1]
            line2 = seg2.get("line", "green").title()
            dir2 = seg2.get("to_station", "Destination")
            
            walk_time = arr_iso_1 + timedelta(minutes=interchange_time)

            instructions.append({
                "stage": InstructionStage.WALK_TO_PLATFORM.value,
                "title": f"Walk to {line2} Line Platform",
                "description": f"Transferring to train towards {dir2}.",
                "eta_minutes": interchange_time,
                "scheduled_time": walk_time.isoformat(),
                "line": line2,
                "direction": dir2,
                "station": interchange_stn,
            })

            try:
                dep_iso_2 = datetime.fromisoformat(seg2.get("departure_iso", walk_time.isoformat()))
            except Exception:
                dep_iso_2 = walk_time

            wait_mins_2 = max(0, int((dep_iso_2 - walk_time).total_seconds() / 60))

            platform2 = None
            if next_trains:
                for t in next_trains:
                    if t.get("line") == line2.lower() and t.get("destination") == dir2:
                        platform2 = t.get("platform")
                        break

            inst_wait2 = {
                "stage": InstructionStage.WAITING_CONNECTING_TRAIN.value,
                "title": f"Wait for {line2} Line Train",
                "description": f"Connecting train towards {dir2}.",
                "eta_minutes": wait_mins_2,
                "scheduled_time": dep_iso_2.isoformat(),
                "line": line2,
                "direction": dir2,
                "station": interchange_stn,
            }
            if platform2:
                inst_wait2["platform"] = platform2
            instructions.append(inst_wait2)

            inst_board2 = {
                "stage": InstructionStage.BOARD_CONNECTING_TRAIN.value,
                "title": f"Board {line2} Line Train",
                "description": f"Please allow passengers to de-board first.",
                "eta_minutes": 0,
                "scheduled_time": dep_iso_2.isoformat(),
                "line": line2,
                "direction": dir2,
                "station": interchange_stn,
            }
            if platform2:
                inst_board2["platform"] = platform2
            instructions.append(inst_board2)

            travel_time_2 = seg2.get("travel_time_minutes", 0)
            arr_iso_2 = dep_iso_2 + timedelta(minutes=travel_time_2)

            instructions.append({
                "stage": InstructionStage.IN_CONNECTING_TRAIN.value,
                "title": f"Traveling on {line2} Line",
                "description": f"{seg2.get('stations_count', len(seg2.get('stations', [])))} stations to go.",
                "eta_minutes": travel_time_2,
                "scheduled_time": arr_iso_2.isoformat(),
                "line": line2,
                "direction": dir2,
                "station": "In Transit",
            })
            
            final_stn = seg2.get("to_station", "Destination")
            final_arr = arr_iso_2
            final_line = line2
            final_dir = dir2
        else:
            final_stn = seg1.get("to_station", "Destination")
            final_arr = arr_iso_1
            final_line = line1
            final_dir = dir1

        instructions.append({
            "stage": InstructionStage.APPROACHING_DESTINATION.value,
            "title": f"Approaching {final_stn}",
            "description": "Prepare to de-board. Ensure you have all belongings.",
            "eta_minutes": 1,
            "scheduled_time": final_arr.isoformat(),
            "line": final_line,
            "direction": final_dir,
            "station": final_stn,
        })

        instructions.append({
            "stage": InstructionStage.DEBOARD_DESTINATION.value,
            "title": f"De-board at {final_stn}",
            "description": "Please exit the train carefully.",
            "eta_minutes": 0,
            "scheduled_time": final_arr.isoformat(),
            "line": final_line,
            "direction": final_dir,
            "station": final_stn,
        })

        instructions.append({
            "stage": InstructionStage.ARRIVED.value,
            "title": "Journey Complete",
            "description": "Thank you for traveling with Namma Metro.",
            "eta_minutes": 0,
            "scheduled_time": final_arr.isoformat(),
            "line": final_line,
            "direction": final_dir,
            "station": final_stn,
        })

        # Apply active flag and dynamic ETAs based on live_status
        return InstructionEngine._apply_live_status(instructions, live_status, start_time)

    @staticmethod
    def _apply_live_status(instructions: List[Dict], live_status: Dict, start_time: datetime) -> List[Dict]:
        status_str = live_status.get("status")
        seg_idx = live_status.get("current_segment", 0)
        seg_prog = live_status.get("segment_progress", 0.0)
        remaining = max(0, int(live_status.get("remaining_minutes", 0)))
        elapsed = max(0, int(live_status.get("elapsed_minutes", 0)))
        
        active_idx = 0

        if status_str == "completed":
            active_idx = len(instructions) - 1
        elif status_str == "boarding":
            if seg_idx == 0:
                active_idx = 0 if remaining > 0 else 1
            else:
                active_idx = next((i for i, inst in enumerate(instructions) if inst["stage"] == InstructionStage.WAITING_CONNECTING_TRAIN.value), 0)
        elif status_str == "in_progress":
            if seg_idx == 0:
                active_idx = next((i for i, inst in enumerate(instructions) if inst["stage"] == InstructionStage.IN_FIRST_TRAIN.value), 0)
            else:
                active_idx = next((i for i, inst in enumerate(instructions) if inst["stage"] == InstructionStage.IN_CONNECTING_TRAIN.value), 0)
        elif status_str == "approaching_interchange":
            active_idx = next((i for i, inst in enumerate(instructions) if inst["stage"] == InstructionStage.APPROACHING_INTERCHANGE.value), 0)
            if seg_prog > 0.98:
                active_idx += 1
        elif status_str == "approaching_destination":
            active_idx = next((i for i, inst in enumerate(instructions) if inst["stage"] == InstructionStage.APPROACHING_DESTINATION.value), 0)
            if seg_prog > 0.98:
                active_idx += 1

        for i, inst in enumerate(instructions):
            inst["active"] = (i == active_idx)
            
            # Dynamically adjust ETAs
            if inst["active"]:
                if "WAITING" in inst["stage"]:
                    now = start_time + timedelta(minutes=elapsed)
                    sch_time = datetime.fromisoformat(inst["scheduled_time"])
                    inst["eta_minutes"] = max(0, int((sch_time - now).total_seconds() / 60))
                else:
                    inst["eta_minutes"] = remaining

        return instructions
