"""
Namma Metro Journey Companion — FastAPI Backend

Production-quality API for metro journey assistance.
All endpoints consume data from the provider layer.
All train positions are schedule-computed.
OpenAPI documentation at /docs.
"""

import asyncio
import uuid
import logging
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from data.stations import (
    get_all_stations,
    get_line_stations,
    find_route,
    build_station_registry,
)
from data_providers import get_schedule_provider
from services.schedule_engine import ScheduleEngine
from services.train_simulator import TrainSimulator
from services.alert_engine import AlertEngine
from services.instruction_engine import InstructionEngine
from services.ai_interfaces import PlaceholderCrowdEstimator

# ── Logging ──
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── App ──
app = FastAPI(
    title="Namma Metro Journey Companion API",
    description=(
        "Backend API for the Namma Metro Journey Companion. "
        "Provides schedule-driven journey planning, real-time tracking, "
        "and train position computation."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Service Initialization ──
provider = get_schedule_provider("auto")
schedule_engine = ScheduleEngine(provider)
train_simulator = TrainSimulator(provider)
crowd_estimator = PlaceholderCrowdEstimator()

# ── In-memory journey store ──
active_journeys: dict = {}


# ── Request Models ──

class JourneyRequest(BaseModel):
    source: str
    destination: str


class TicketPurchase(BaseModel):
    source: str
    destination: str
    passengers: int = 1


# ── Health & Info ──

@app.get("/", tags=["System"])
async def root():
    provider_name = await provider.get_provider_name()
    return {
        "service": "Namma Metro Journey Companion API",
        "version": "2.0.0",
        "data_provider": provider_name,
        "status": "operational",
    }


@app.get("/api/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "data_provider": await provider.get_provider_name(),
        "purple_line_operational": await provider.is_operational("purple"),
        "green_line_operational": await provider.is_operational("green"),
        "active_journeys": len(active_journeys),
        "timestamp": datetime.now().isoformat(),
    }


# ── Station Endpoints ──

@app.get("/api/stations", tags=["Stations"])
async def list_stations(line: Optional[str] = None):
    """Get all stations, optionally filtered by line."""
    if line:
        return {"stations": get_line_stations(line), "line": line}
    return {"stations": get_all_stations()}


@app.get("/api/stations/{line}", tags=["Stations"])
async def get_stations_by_line(line: str):
    """Get stations for a specific metro line."""
    if line not in ("purple", "green"):
        raise HTTPException(status_code=400, detail="Line must be 'purple' or 'green'")
    return {"stations": get_line_stations(line), "line": line}


# ── Journey Planning ──

@app.post("/api/journey/plan", tags=["Journey"])
async def plan_journey(req: JourneyRequest):
    """
    Plan a route between two stations.
    Uses Dijkstra's algorithm on the station graph.
    Times computed from schedule provider.
    """
    route = find_route(req.source, req.destination)
    if not route:
        raise HTTPException(
            status_code=404,
            detail=f"No route found between '{req.source}' and '{req.destination}'",
        )

    enriched_segments = await schedule_engine.compute_journey_times(route.segments)

    # Get next trains at source
    source_line = enriched_segments[0].get("line", "purple") if enriched_segments else "purple"
    next_trains = await schedule_engine.get_next_trains(
        req.source, source_line, count=3
    )

    return {
        "route": {
            "segments": enriched_segments,
            "total_time_minutes": route.total_time_minutes,
            "interchange_count": route.interchange_count,
            "fare_estimate": route.fare_estimate,
            "stations_count": route.stations_count,
        },
        "next_trains": next_trains,
    }


# ── Ticket Purchase ──

@app.post("/api/ticket/purchase", tags=["Tickets"])
async def purchase_ticket(req: TicketPurchase):
    """
    Purchase a QR ticket and initialize journey tracking.
    Returns ticket data with computed journey segments.
    """
    if req.passengers < 1 or req.passengers > 6:
        raise HTTPException(status_code=400, detail="Passengers must be 1-6")

    route = find_route(req.source, req.destination)
    if not route:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid route: '{req.source}' to '{req.destination}'",
        )

    enriched_segments = await schedule_engine.compute_journey_times(route.segments)

    ticket_id = (
        f"{datetime.now().strftime('%d%m%Y%H%M%S')}"
        f"M{uuid.uuid4().hex[:10].upper()}"
    )
    journey_id = str(uuid.uuid4())

    registry = build_station_registry()
    source_name = registry[req.source].name if req.source in registry else req.source
    dest_name = registry[req.destination].name if req.destination in registry else req.destination

    # Store journey for tracking
    active_journeys[journey_id] = {
        "ticket_id": ticket_id,
        "journey_id": journey_id,
        "source_id": req.source,
        "destination_id": req.destination,
        "source": source_name,
        "destination": dest_name,
        "passengers": req.passengers,
        "segments": enriched_segments,
        "total_time_minutes": route.total_time_minutes,
        "interchange_count": route.interchange_count,
        "stations_count": route.stations_count,
        "fare": route.fare_estimate * req.passengers,
        "start_time": datetime.now().isoformat(),
        "status": "active",
    }

    return {
        "ticket_id": ticket_id,
        "journey_id": journey_id,
        "source": source_name,
        "source_id": req.source,
        "destination": dest_name,
        "destination_id": req.destination,
        "passengers": req.passengers,
        "fare": route.fare_estimate * req.passengers,
        "payment_mode": "UPI",
        "transaction_time": datetime.now().strftime("%d-%m-%Y %H:%M:%S"),
        "route": {
            "segments": enriched_segments,
            "total_time_minutes": route.total_time_minutes,
            "interchange_count": route.interchange_count,
            "stations_count": route.stations_count,
        },
    }


# ── Journey Tracking ──

@app.get("/api/journey/{journey_id}", tags=["Journey"])
async def get_journey(journey_id: str):
    """Get journey details and computed live status."""
    if journey_id not in active_journeys:
        raise HTTPException(status_code=404, detail="Journey not found")

    journey = active_journeys[journey_id]
    start_time = datetime.fromisoformat(journey["start_time"])

    live_status = await schedule_engine.get_live_status(
        start_time, journey["segments"]
    )
    alerts = AlertEngine.generate_alerts(live_status, journey["segments"])
    
    current_seg_idx = live_status.get("current_segment", 0)
    current_seg = journey["segments"][current_seg_idx] if current_seg_idx < len(journey["segments"]) else journey["segments"][-1]
    
    next_trains = await schedule_engine.get_next_trains(
        current_seg.get("from_station_id", ""), 
        current_seg.get("line", "purple")
    )

    instructions = InstructionEngine.generate_instructions(
        journey["segments"], live_status, start_time, next_trains=next_trains
    )

    return {
        "journey": journey,
        "live_status": live_status,
        "alerts": alerts,
        "instructions": instructions,
    }


# ── Train Positions ──

@app.get("/api/train/positions", tags=["Trains"])
async def get_all_train_positions():
    """
    Get positions of all active trains.
    Computed mathematically from schedules — not random.
    """
    positions = await train_simulator.compute_all_positions()
    return {
        "positions": [p.dict() for p in positions],
        "count": len(positions),
        "computed_at": datetime.now().isoformat(),
        "source": "schedule-computed",
    }


@app.get("/api/train/next/{station_id}", tags=["Trains"])
async def get_next_trains_at_station(
    station_id: str,
    line: str = "purple",
    count: int = 3,
):
    """Get next train arrivals at a station."""
    trains = await schedule_engine.get_next_trains(station_id, line, count)
    return {
        "station_id": station_id,
        "line": line,
        "trains": trains,
    }


# ── Schedule ──

@app.get("/api/schedule/info/{line}", tags=["Schedule"])
async def get_schedule_info(line: str):
    """Get schedule information for a line."""
    if line not in ("purple", "green"):
        raise HTTPException(status_code=400, detail="Line must be 'purple' or 'green'")

    window = await provider.get_operating_window(line)
    frequencies = await provider.get_frequencies(line)

    return {
        "line": line,
        "operating_window": {
            "first_train": window.first_train.isoformat(),
            "last_train": window.last_train.isoformat(),
            "terminal_up": window.terminal_station_up,
            "terminal_down": window.terminal_station_down,
        },
        "frequencies": [f.dict() for f in frequencies if not f.is_weekend],
        "weekend_frequencies": [f.dict() for f in frequencies if f.is_weekend],
        "provider": await provider.get_provider_name(),
    }


# ── AI Analytics (Placeholder) ──

@app.get("/api/crowd/{station_id}", tags=["AI Analytics"])
async def get_crowd_estimate(station_id: str):
    """
    Get crowd estimate for a station.
    Currently returns 'unavailable' — no fake data generated.
    Real AI analytics can be connected via the CrowdEstimator interface.
    """
    estimate = await crowd_estimator.estimate_crowd(station_id)
    return estimate.dict()


# ── WebSocket for Journey Tracking ──

@app.websocket("/ws/journey/{journey_id}")
async def journey_websocket(websocket: WebSocket, journey_id: str):
    """Real-time journey updates via WebSocket."""
    await websocket.accept()

    if journey_id not in active_journeys:
        await websocket.send_json({"error": "Journey not found"})
        await websocket.close()
        return

    journey = active_journeys[journey_id]
    start_time = datetime.fromisoformat(journey["start_time"])

    try:
        while True:
            live_status = await schedule_engine.get_live_status(
                start_time, journey["segments"]
            )
            alerts = AlertEngine.generate_alerts(live_status, journey["segments"])
            
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
                "alerts": alerts,
                "instructions": instructions,
                "timestamp": datetime.now().isoformat(),
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


# ── Data Provider Info ──

@app.get("/api/provider/status", tags=["System"])
async def get_provider_status():
    """Get information about the current data provider."""
    from data_providers.bmrc_scraper import BMRCScraperProvider

    status = {
        "provider": await provider.get_provider_name(),
        "type": type(provider).__name__,
    }

    if isinstance(provider, BMRCScraperProvider):
        status["scrape_status"] = provider.scrape_status

    return status


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
