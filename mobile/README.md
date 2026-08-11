# Namma Metro Frontend (Mobile App)

The official frontend companion application for Namma Metro commuters. Note: The application source code is physically located in the `mobile/` directory of the repository.

## 🎯 Purpose
This mobile application provides commuters with an interactive, modern, and reliable interface to plan journeys, purchase tickets, view live train schedules, and receive context-aware navigation instructions while inside the metro system. 

## 🛠 Tech Stack
- **Framework:** React Native with Expo (`expo-cli`)
- **Language:** TypeScript
- **State Management:** Zustand (Global State) & React Query (Server State / API Caching)
- **Navigation:** React Navigation (Bottom Tabs, Native Stack)
- **Styling & UI:** Expo Linear Gradient, React Native SVG, Reanimated
- **Utilities:** `date-fns` for time manipulation, `react-native-qrcode-svg` for digital ticketing.

## 🏗 Architecture & Folder Structure

The source code resides inside the `mobile/src/` directory:

```text
mobile/
├── App.tsx                  # Root entry point, Context Providers, Navigation
├── app.json                 # Expo configuration
├── package.json             # Node dependencies
└── src/
    ├── features/            # Feature-based module organization
    │   ├── home/            # Home dashboard screens
    │   ├── journey/         # Live journey tracking interfaces
    │   ├── metro-map/       # Interactive network map
    │   ├── notifications/   # In-app alert overlay
    │   ├── route-planner/   # Dijkstra route planning UI
    │   └── tickets/         # Digital QR ticket purchasing & display
    ├── navigation/          # React Navigation stack and tab configurations
    └── shared/              # Reusable components, hooks, and API clients
```

## 📱 Screens & Core Components
- **Home Dashboard:** Quick access to journey planning, recent tickets, and network status.
- **Route Planner:** Source/Destination selection showing computed time, interchanges, and fare estimates.
- **Digital Tickets:** Generates QR codes for station entry/exit using `react-native-qrcode-svg`.
- **Live Journey Tracker:** Connects to the backend WebSocket to display real-time progress, current segment, and dynamic passenger instructions.
- **Metro Map:** Visual representation of the Purple and Green lines.
- **Notification Overlay:** Global overlay component (`NotificationOverlay`) for system alerts and interchange warnings.

## 🔄 State Management & API Integration
- **Server State:** `@tanstack/react-query` is configured with a 30-second stale time for optimal caching of train schedules and station lists.
- **Global UI State:** `zustand` is used for managing active journey references and user preferences locally.
- **Real-Time Sync:** WebSockets are leveraged during an active journey to receive push notifications and live train updates from the backend's Instruction Engine.

## ⚙️ Environment Variables
*Currently, backend API URLs are configured within the application codebase. For local development, ensure your physical device or emulator can route to the backend server's IP address.*

## 🚀 Setup & Run Commands

1. **Navigate to the mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Expo development server:**
   ```bash
   npm start
   ```

4. **Run on specific platforms:**
   - **Android:** `npm run android`
   - **iOS:** `npm run ios`
   - **Web:** `npm run web`

## 🛠 Troubleshooting & Contribution
- **Connection Issues:** If the app cannot fetch stations, ensure the backend FastAPI server is running. On a physical device, you may need to update the API base URL to your local machine's IP address instead of `localhost`.
- **Metro Map Rendering:** SVGs rely on `react-native-svg`; ensure the native modules are properly linked if ejecting from Expo.
