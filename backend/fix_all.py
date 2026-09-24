import os
import re

IST_IMPORT = "from datetime import datetime, timedelta, timezone\nIST = timezone(timedelta(hours=5, minutes=30))\n"

def replace_in_file(path, pattern, replacement):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = re.sub(pattern, replacement, content)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# Update train_simulator.py
ts_path = 'services/train_simulator.py'
with open(ts_path, 'r', encoding='utf-8') as f:
    ts_content = f.read()
ts_content = ts_content.replace('from datetime import datetime, timedelta, time as dtime', 
                                'from datetime import datetime, timedelta, time as dtime, timezone\nIST = timezone(timedelta(hours=5, minutes=30))')
ts_content = ts_content.replace('datetime.now()', 'datetime.now(IST)')
ts_content = ts_content.replace('datetime.combine(target_date.date(), window.first_train)', 'datetime.combine(target_date.date(), window.first_train, tzinfo=IST)')
ts_content = ts_content.replace('datetime.combine(target_date.date(), window.last_train)', 'datetime.combine(target_date.date(), window.last_train, tzinfo=IST)')

# Math fixing in train_simulator.py (sinusoidal)
sin_math = '''
                if seg_duration > 0:
                    import math
                    linear_progress = (elapsed - curr_offset) / seg_duration
                    progress = (1 - math.cos(linear_progress * math.pi)) / 2
                else:
                    progress = 0.0
'''
ts_content = re.sub(r'                if seg_duration > 0:\n                    progress = \(elapsed - curr_offset\) / seg_duration\n                else:\n                    progress = 0\.0', sin_math, ts_content)
with open(ts_path, 'w', encoding='utf-8') as f:
    f.write(ts_content)

# Update schedule_engine.py
se_path = 'services/schedule_engine.py'
with open(se_path, 'r', encoding='utf-8') as f:
    se_content = f.read()
se_content = se_content.replace('from datetime import datetime, timedelta', 'from datetime import datetime, timedelta, timezone\nIST = timezone(timedelta(hours=5, minutes=30))')
se_content = se_content.replace('datetime.now()', 'datetime.now(IST)')

# Fix the loop double adjustment issue in compute_journey_times
fixed_loop_end = '''            if i < len(segments) - 1:
                walk_time = await self._provider.get_interchange_walk_time()
                current_time = arrival + timedelta(minutes=walk_time)
                # Next segment's loop iteration will align to frequency'''
se_content = re.sub(r'            if i < len\(segments\) - 1:\n                walk_time = await self\._provider\.get_interchange_walk_time\(\)\n                current_time = arrival \+ timedelta\(minutes=walk_time\)\n.*?current_time = current_time\.replace\(second=0, microsecond=0\)', fixed_loop_end, se_content, flags=re.DOTALL)
with open(se_path, 'w', encoding='utf-8') as f:
    f.write(se_content)

# Update main.py
main_path = 'main.py'
with open(main_path, 'r', encoding='utf-8') as f:
    main_content = f.read()
main_content = main_content.replace('from datetime import datetime, timedelta', 'from datetime import datetime, timedelta, timezone\nIST = timezone(timedelta(hours=5, minutes=30))')
main_content = main_content.replace('datetime.now()', 'datetime.now(IST)')
main_content = main_content.replace('bmrc_scraper', 'gtfs_provider')
main_content = main_content.replace('BMRCScraperProvider', 'GTFSProvider')

ws_fixed = '''    try:
        sent_alerts = set()
        while True:
            live_status = await schedule_engine.get_live_status(
                start_time, journey["segments"]
            )
            alerts = AlertEngine.generate_alerts(live_status, journey["segments"])
            
            new_alerts = []
            for alert in alerts:
                if alert["type"] not in sent_alerts:
                    new_alerts.append(alert)
                    sent_alerts.add(alert["type"])
            
            current_seg_idx = live_status.get("current_segment", 0)
            current_seg = journey["segments"][current_seg_idx] if current_seg_idx < len(journey["segments"]) else journey["segments"][-1]
            
            next_trains = await schedule_engine.get_next_trains(
                current_seg.get("from_station_id", ""), 
                current_seg.get("line", "purple")
            )

            instructions = InstructionEngine.generate_instructions(
                journey["segments"], live_status, start_time, next_trains=next_trains
            )

            await websocket.send_json({
                "type": "journey_update",
                "live_status": live_status,
                "alerts": new_alerts,
                "instructions": instructions,
                "timestamp": datetime.now(IST).isoformat(),
            })

            if live_status["status"] == "completed":
                await websocket.send_json({
                    "type": "journey_complete",
                    "message": "Journey completed! Thank you for traveling with Namma Metro.",
                })
                break

            await asyncio.sleep(5)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for journey {journey_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
'''
main_content = re.sub(r'    try:\n        while True:\n            live_status = await schedule_engine.*?logger\.info\(f"WebSocket disconnected for journey \{journey_id\}"\)', ws_fixed, main_content, flags=re.DOTALL)
with open(main_path, 'w', encoding='utf-8') as f:
    f.write(main_content)

# Update alert_engine.py
alert_path = 'services/alert_engine.py'
with open(alert_path, 'r', encoding='utf-8') as f:
    alert_content = f.read()
alert_content = alert_content.replace('from datetime import datetime', 'from datetime import datetime, timezone, timedelta\nIST = timezone(timedelta(hours=5, minutes=30))')
alert_content = alert_content.replace('datetime.now()', 'datetime.now(IST)')
with open(alert_path, 'w', encoding='utf-8') as f:
    f.write(alert_content)

# Update provider factory
pf_path = 'data_providers/provider_factory.py'
with open(pf_path, 'r', encoding='utf-8') as f:
    pf_content = f.read()
pf_content = pf_content.replace('bmrc_scraper', 'gtfs_provider')
pf_content = pf_content.replace('BMRCScraperProvider', 'GTFSProvider')
pf_content = pf_content.replace('bmrc', 'gtfs')
pf_content = pf_content.replace('BMRC', 'GTFS')
with open(pf_path, 'w', encoding='utf-8') as f:
    f.write(pf_content)

# Update __init__.py
init_path = 'data_providers/__init__.py'
with open(init_path, 'r', encoding='utf-8') as f:
    init_content = f.read()
init_content = init_content.replace('bmrc_scraper', 'gtfs_provider')
init_content = init_content.replace('BMRCScraperProvider', 'GTFSProvider')
init_content = init_content.replace('BMRC', 'GTFS')
init_content = init_content.replace('bmrc', 'gtfs')
with open(init_path, 'w', encoding='utf-8') as f:
    f.write(init_content)

gtfs_content = '''"""
GTFS Provider — Pluggable GTFS data provider layer.
"""
from datetime import datetime
from typing import List, Optional
import logging

from .base import ScheduleProvider, TrainFrequency, OperatingWindow, StationTiming
from .static_provider import StaticScheduleProvider

logger = logging.getLogger(__name__)

class GTFSProvider(ScheduleProvider):
    """
    GTFS schedule data provider.
    Currently acts as a clean adapter structure for a valid GTFS feed,
    falling back to StaticScheduleProvider if GTFS data is missing/invalid.
    """
    def __init__(self, gtfs_path: str = None):
        self._fallback = StaticScheduleProvider()
        self._gtfs_path = gtfs_path
        self._gtfs_loaded = False
        
    async def _ensure_loaded(self):
        pass
        
    async def get_operating_window(self, line: str) -> OperatingWindow:
        await self._ensure_loaded()
        return await self._fallback.get_operating_window(line)

    async def get_frequencies(self, line: str) -> List[TrainFrequency]:
        await self._ensure_loaded()
        return await self._fallback.get_frequencies(line)

    async def get_frequency_at(self, line: str, hour: int, is_weekend: bool = False) -> int:
        await self._ensure_loaded()
        return await self._fallback.get_frequency_at(line, hour, is_weekend)

    async def get_station_timings(self, line: str) -> List[StationTiming]:
        await self._ensure_loaded()
        return await self._fallback.get_station_timings(line)

    async def get_travel_time(self, from_station: str, to_station: str, line: str) -> int:
        await self._ensure_loaded()
        return await self._fallback.get_travel_time(from_station, to_station, line)

    async def get_interchange_walk_time(self) -> int:
        return await self._fallback.get_interchange_walk_time()

    async def get_provider_name(self) -> str:
        if self._gtfs_loaded:
            return "GTFSProvider (Live GTFS Data)"
        return "GTFSProvider (Static Fallback)"

    async def is_operational(self, line: str) -> bool:
        return await self._fallback.is_operational(line)
    
    @property
    def scrape_status(self) -> dict:
        return {
            "last_attempt": None,
            "success": self._gtfs_loaded,
            "scraped_data_available": self._gtfs_loaded,
            "fallback_active": not self._gtfs_loaded,
            "url": self._gtfs_path,
        }
'''
with open('data_providers/gtfs_provider.py', 'w', encoding='utf-8') as f:
    f.write(gtfs_content)

if os.path.exists('data_providers/bmrc_scraper.py'):
    os.remove('data_providers/bmrc_scraper.py')
print("Refactoring complete.")
