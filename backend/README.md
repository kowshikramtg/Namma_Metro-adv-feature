# Namma Metro Backend API

Provides schedule-driven journey planning, real-time tracking, train position computation, and data scraping for the Namma Metro Journey Companion.

## 🎯 Purpose
This backend serves as the core intelligence engine for the Namma Metro app. It calculates fastest routes, predicts train arrivals based on real or scraped schedule data, simulates active train positions, and broadcasts real-time journey instructions via WebSockets.

## 🛠 Tech Stack
- **Framework:** FastAPI (Python 3)
- **Server:** Uvicorn
- **Data Validation:** Pydantic
- **Real-Time Communication:** WebSockets
- **Web Scraping:** BeautifulSoup4, httpx
- **Date Handling:** python-dateutil

## 🏗 Architecture & Folder Structure

```text
backend/
├── main.py                  # FastAPI entry point & route definitions
├── requirements.txt         # Python dependencies
├── data/                    # Station definitions, line data, and graph topologies
├── data_providers/          # Abstraction layer for fetching schedule data
│   ├── base.py              # Base provider interface
│   ├── bmrc_scraper.py      # Scrapes official BMRC schedules
│   ├── static_provider.py   # Fallback static schedule data
│   └── future_api_provider.py # Skeleton for future official API
└── services/                # Core business logic
    ├── schedule_engine.py   # Computes train times & journey segments
    ├── train_simulator.py   # Mathematically computes train positions
    ├── alert_engine.py      # Generates journey alerts (e.g., interchanges)
    ├── instruction_engine.py# Generates live passenger instructions
    └── ai_interfaces.py     # Placeholder for AI analytics (crowd estimation)
```

## 🧠 Core Engines
* **Route & Dijkstra Engine:** Located in `data/stations.py`, computes the fastest route across lines using a graph topology.
* **Schedule Engine:** Located in `services/schedule_engine.py`, resolves train timings dynamically using the current Data Provider.
* **Journey Intelligence & Instructions:** Located in `services/instruction_engine.py` and `alert_engine.py`, tracking a user's simulated position and pushing context-aware alerts (e.g., "Prepare to alight at Majestic").

## 🔌 Real API Endpoints

### System & Health
- `GET /` - API Information.
- `GET /api/health` - Health check and system operational status.
- `GET /api/provider/status` - Current schedule data provider status.

### Stations & Routing
- `GET /api/stations` - List all stations.
- `GET /api/stations/{line}` - List stations by line (`purple` or `green`).
- `POST /api/journey/plan` - Plan a journey between two stations (Returns route segments, time, and fare).

### Tickets & Tracking
- `POST /api/ticket/purchase` - Purchase a QR ticket (Returns ticket ID and journey details).
- `GET /api/journey/{journey_id}` - Get journey details and computed live status.
- `WS /ws/journey/{journey_id}` - Real-time WebSocket connection for live journey updates and alerts.

### Trains & Schedules
- `GET /api/train/positions` - Get mathematically computed positions of all active trains.
- `GET /api/train/next/{station_id}` - Get next train arrivals at a specific station.
- `GET /api/schedule/info/{line}` - Get operating window and frequencies for a line.

### Analytics (Planned/Placeholder)
- `GET /api/crowd/{station_id}` - Returns crowd estimate (Currently placeholder data).

## ⚙️ Environment Variables
Currently, the backend does not strictly require environment variables for basic execution, but relies on a standard Python environment.

## 🚀 Setup & Run Commands

1. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the server:**
   ```bash
   python main.py
   ```
   *Alternatively, run with uvicorn directly:*
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

The API will be available at `http://localhost:8000`.
Swagger UI documentation is automatically generated at `http://localhost:8000/docs`.
Redoc documentation is available at `http://localhost:8000/redoc`.

## 🤝 Contribution & Troubleshooting
* **Web Scraping Issues:** If schedules fail to load, check `data_providers/bmrc_scraper.py`. The official BMRC website structure may have changed. The system falls back to `static_provider` automatically if scraping fails.
* **Testing:** Use the built-in Swagger UI (`/docs`) to test endpoints easily without a frontend.
