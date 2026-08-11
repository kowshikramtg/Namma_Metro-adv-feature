# Namma Metro — Journey Companion

A complete, modern, full-stack application designed to provide commuters with an intelligent and seamless metro travel experience. It features Dijkstra-based route planning, real-time schedule computation, and live journey tracking with context-aware notifications.

---

## 📖 Vision & Problem Statement
Navigating urban transit can be stressful due to lack of real-time visibility, confusing interchanges, and unpredictable crowd levels. The **Namma Metro Journey Companion** solves this by providing commuters with an intuitive mobile app backed by an intelligent backend that computes train positions dynamically based on official schedules. The system tracks the user's journey in real-time, offering proactive instructions (e.g., "Change to Green Line at Majestic") and digital QR ticketing.

## ✨ Actual Features
- **Intelligent Route Planning:** Calculates the fastest path between stations using Dijkstra's algorithm, accounting for interchanges.
- **Live Schedule Computation:** Determines train arrival times and current positions dynamically using BMRC schedule data.
- **Digital Ticketing:** QR-code based ticket generation.
- **Real-Time Journey Tracking:** Uses WebSockets to push live travel updates and passenger instructions to the frontend.
- **Interactive Metro Map:** A visual interface for the Purple and Green lines.
- **Data Scraping Fallback:** Automatically scrapes official schedules, with static data fallbacks for guaranteed uptime.
- **Planned:** AI-based crowd estimation analytics.

## 🛠 Tech Stack
| Component | Technologies |
| :--- | :--- |
| **Mobile (Mobile App)** | React Native, Expo, TypeScript, React Query, Zustand, React Navigation |
| **Backend (API Server)** | Python 3, FastAPI, Uvicorn, WebSockets, Pydantic, BeautifulSoup4 |

## 🏗 Overall Architecture

```mermaid
graph TD
    subgraph Frontend [Mobile App - React Native]
        UI[User Interface]
        State[Zustand & React Query]
        WS_Client[WebSocket Client]
    end

    subgraph Backend [FastAPI Server]
        API[REST API Endpoints]
        WS_Server[WebSocket Manager]
        
        subgraph Engines [Intelligence Layer]
            Route[Route/Dijkstra Engine]
            Schedule[Schedule Engine]
            Alert[Alert & Instruction Engine]
            Sim[Train Simulator]
        end
        
        subgraph Data [Data Layer]
            Scraper[BMRC Scraper]
            Static[Static Schedules]
            Topology[Station Graph]
        end
    end

    UI --> State
    State <--> API
    WS_Client <--> WS_Server
    
    API --> Route
    API --> Schedule
    WS_Server --> Alert
    
    Route --> Topology
    Schedule --> Scraper
    Schedule --> Static
    Alert --> Schedule
    Sim --> Schedule
```

### 🔄 Frontend ↔ Backend Data Flow
1. **Initial Load:** The frontend uses React Query to fetch the station list and system health from the backend REST API.
2. **Planning:** User inputs source and destination. The backend runs Dijkstra's algorithm and queries the `ScheduleEngine` to estimate travel time and next train arrivals, returning the route segments.
3. **Ticketing:** A ticket is purchased via REST API. The backend registers an `active_journey`.
4. **Live Tracking:** The frontend opens a WebSocket connection to `/ws/journey/{journey_id}`.
5. **Real-time Push:** The backend runs a background loop, consulting the `InstructionEngine` and `AlertEngine`, pushing JSON updates to the frontend every few seconds regarding current segment progress and interchange alerts.

## 📁 Project Structure
- `mobile/` - The React Native (Expo) frontend application. (Documented in `frontend/README.md`)
- `backend/` - The FastAPI Python server. (Documented in `backend/README.md`)

## 🚀 Setup & Run Commands

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
*API running at `http://localhost:8000`*

### Frontend (React Native/Expo)
```bash
cd mobile
npm install
npm start
```
*Use the Expo Go app on your phone, or run via emulator.*

## 🗺 Roadmap
- [ ] Implement actual AI Crowd Estimation (currently placeholder).
- [ ] Add support for the upcoming Yellow Line.
- [ ] Multi-language support (Kannada/English UI).
- [ ] Integration with a future official BMRC Live API instead of schedule scraping.

## 📚 Detailed Documentation
Please refer to the sub-READMEs for specific, detailed information on each stack layer:
- **[Frontend Documentation](mobile/README.md)**
- **[Backend Documentation](backend/README.md)**
