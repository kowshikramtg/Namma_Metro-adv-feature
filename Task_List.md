# Namma Metro — Project Audit

### 1. WHAT are we building?
A complete, modern, full-stack application providing commuters with an intelligent and seamless metro travel experience. It acts as a "Journey Companion," featuring Dijkstra-based route planning, real-time schedule computation, digital ticketing, and live journey tracking with context-aware passenger notifications.

### 2. WHAT is already built?
🟢 BUILT:
- **Backend Core (`backend/`)**: FastAPI server using WebSockets, Pydantic, and Uvicorn.
- **Dijkstra Route Engine (`backend/data/stations.py`)**: Computes fastest paths and interchanges across the metro graph.
- **Train Simulator (`backend/services/train_simulator.py`)**: Mathematically computes active train positions based on schedules (no random data).
- **Journey Tracking & Alerts (`backend/services/instruction_engine.py`, `alert_engine.py`)**: Real-time push notifications over WebSockets for interchanges and arrivals.
- **Mobile Application (`mobile/`)**: React Native frontend built with Expo, TypeScript, Zustand, and React Query.
- **Digital Tickets (`mobile/src/features/tickets/`)**: QR-code ticket generation and display interfaces.
- **Metro Map (`mobile/src/features/metro-map/`)**: Interactive SVG-based network map rendering.

### 3. WHAT is missing?
🔴 MISSING:
- **Actual AI Analytics**: The backend (`backend/services/ai_interfaces.py`) only implements a `PlaceholderCrowdEstimator` that returns "Data Unavailable". No real crowd estimation exists.
- **Network Expansion**: Support for the upcoming Yellow Line is completely absent (only Purple and Green lines are in `stations.py`).
- **Localization**: Multi-language support (Kannada/English UI) is not implemented.
- **Real Payments**: The ticketing API (`backend/main.py`) blindly accepts purchases and mocks a UPI payment response without any payment gateway integration.

### 4. WHAT is broken?
🐛 BROKEN:
- **BMRC Web Scraper (`backend/data_providers/bmrc_scraper.py`)**: The scraper attempts to parse Next.js `__NEXT_DATA__` from the official site. It is highly fragile to UI updates and silently fails over to static fallback data when it breaks. 

### 5. WHAT needs improvement?
🔧 IMPROVEMENT:
- **Resiliency of Schedule Data**: Relying on HTML/JS scraping for critical transit times is unsafe. The system should ideally use a GTFS feed.
- **Environment Management**: Backend API URLs are hardcoded in the mobile app, requiring manual IP changes for local device testing.
- **Testing Infrastructure**: There are no visible unit or integration tests in either the `mobile/` or `backend/` directories to ensure the Dijkstra routing and train math stay accurate.

### 6. WHAT is intentionally postponed?
🔮 FUTURE:
- **Advanced AI Models**: Congestion prediction, coach recommendation, and occupancy forecasting are stubbed out as abstract interfaces waiting for future ML models.
- **Official Live API Integration**: `backend/data_providers/future_api_provider.py` is an empty skeleton waiting for BMRC to release an official transit API.

### 7. WHAT are WE missing?
💡 RECOMMENDED:
- **Offline Route Planning**: Cache the `stations.py` graph data on the mobile device so commuters can calculate routes underground where mobile data is often unavailable.
- **Background Push Notifications**: Integrate FCM/APNs to ensure interchange alerts wake up the user's phone even if the app is backgrounded or the screen is locked.
- **Station Amenities Layer**: Include data on parking availability, elevator operational status, and washrooms for better accessibility.
- **Smart Card / Pass Integration**: Allow users to link their existing Namma Metro smart cards or buy monthly passes, rather than just single-journey QR tickets.
