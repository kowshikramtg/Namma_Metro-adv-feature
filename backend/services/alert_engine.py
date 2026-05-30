"""
Alert Engine — Generates contextual journey alerts based on journey progress.

Alerts are event-driven, triggered by changes in journey status.
No random or fake alerts — all derived from actual journey state.
"""

from datetime import datetime
from typing import List, Dict


class AlertEngine:
    """Generate contextual journey alerts based on computed journey state."""

    ALERT_TYPES = {
        "train_arriving": {
            "icon": "🚇",
            "title": "Train Arriving",
            "color": "#7B2D8E",
            "priority": "high",
        },
        "board_train": {
            "icon": "🚂",
            "title": "Board Train",
            "color": "#7B2D8E",
            "priority": "high",
        },
        "prepare_interchange": {
            "icon": "🔄",
            "title": "Prepare for Interchange",
            "color": "#2196F3",
            "priority": "medium",
        },
        "interchange_ready": {
            "icon": "✅",
            "title": "Interchange Train Ready",
            "color": "#4CAF50",
            "priority": "medium",
        },
        "approaching_destination": {
            "icon": "📍",
            "title": "Approaching Destination",
            "color": "#FF9800",
            "priority": "high",
        },
        "reached_destination": {
            "icon": "🎯",
            "title": "Destination Reached",
            "color": "#4CAF50",
            "priority": "high",
        },
        "next_station": {
            "icon": "📢",
            "title": "Next Station",
            "color": "#666666",
            "priority": "low",
        },
    }

    @staticmethod
    def generate_alerts(journey_status: Dict, segments: List[Dict]) -> List[Dict]:
        """
        Generate alerts based on current journey status.
        Returns only relevant alerts for the current state.
        """
        alerts = []
        status = journey_status.get("status", "")
        current_seg = journey_status.get("current_segment", 0)
        seg_progress = journey_status.get("segment_progress", 0)
        current_station = journey_status.get("current_station", "")
        next_station = journey_status.get("next_station")

        if not segments:
            return alerts

        if status == "boarding":
            seg = segments[0]
            line = seg.get("line", "purple").title()
            alerts.append(AlertEngine._make_alert(
                "board_train",
                f"Board {line} Line train",
                f"Towards {seg.get('to_station', 'destination')}",
            ))

        elif status == "in_progress":
            # Next station announcement
            if next_station:
                alerts.append(AlertEngine._make_alert(
                    "next_station",
                    f"Next: {next_station}",
                    f"On {segments[current_seg].get('line', '').title()} Line",
                ))

        elif status == "approaching_interchange":
            if current_seg + 1 < len(segments):
                next_seg = segments[current_seg + 1]
                alerts.append(AlertEngine._make_alert(
                    "prepare_interchange",
                    f"Prepare to change at {segments[current_seg].get('to_station', '')}",
                    f"Transfer to {next_seg.get('line', '').title()} Line",
                ))

        elif status == "approaching_destination":
            dest = segments[-1].get("to_station", "destination")
            alerts.append(AlertEngine._make_alert(
                "approaching_destination",
                f"Arriving at {dest}",
                "Please collect your belongings and prepare to exit.",
            ))

        elif status == "completed":
            alerts.append(AlertEngine._make_alert(
                "reached_destination",
                "You have reached your destination!",
                "Thank you for traveling with Namma Metro.",
            ))

        return alerts

    @staticmethod
    def _make_alert(alert_type: str, message: str, detail: str = "") -> Dict:
        type_info = AlertEngine.ALERT_TYPES.get(alert_type, {})
        return {
            "id": f"{alert_type}_{int(datetime.now().timestamp() * 1000)}",
            "type": alert_type,
            "icon": type_info.get("icon", "ℹ️"),
            "title": type_info.get("title", "Alert"),
            "message": message,
            "detail": detail,
            "color": type_info.get("color", "#666"),
            "priority": type_info.get("priority", "low"),
            "timestamp": datetime.now().isoformat(),
        }
