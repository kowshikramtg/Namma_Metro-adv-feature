import asyncio
from datetime import datetime, timedelta
from data.stations import find_route
from services.schedule_engine import ScheduleEngine
from data_providers import get_schedule_provider
from services.instruction_engine import InstructionEngine

async def run_demo():
    provider = get_schedule_provider("auto")
    engine = ScheduleEngine(provider)

    routes = [
        ("kengeri_bus_terminal", "mahakavi_kuvempu_road"),
        ("magadi_road", "kengeri_bus_terminal")
    ]
    
    start_time = datetime.now()

    for src, dst in routes:
        print(f"\n{'='*50}\nJourney: {src} -> {dst}\n{'='*50}")
        route = find_route(src, dst)
        if not route:
            print("No route found.")
            continue
            
        enriched = await engine.compute_journey_times(route.segments, start_time)
        live_status = await engine.get_live_status(start_time, enriched)
        instructions = InstructionEngine.generate_instructions(enriched, live_status, start_time)
        
        for idx, inst in enumerate(instructions):
            active_marker = ">> " if inst.get('active') else "   "
            print(f"{active_marker}Step {idx+1}: {inst['stage']}")
            print(f"      Title: {inst['title']}")
            print(f"      Desc:  {inst['description']}")
            print(f"      ETA:   {inst['eta_minutes']} min")
            print(f"      Time:  {inst['scheduled_time']}")
            print(f"      Line:  {inst['line']} | Dir: {inst['direction']} | Station: {inst['station']}")
            print("-" * 40)

if __name__ == "__main__":
    asyncio.run(run_demo())
