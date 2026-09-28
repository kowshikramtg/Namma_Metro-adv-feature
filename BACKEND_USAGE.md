# Namma Metro Backend & Connections Setup Guide

This guide covers how to set up the backend server, configure environment variables for the frontend to connect to it, and details the manual steps you'll need to complete to test the app fully.

---

## 1. Environment Configuration (`.env` files)

Environment files (`.env`) are crucial because they tell the frontend where the backend server is located. When running on a mobile emulator or a physical device, `localhost` (or `127.0.0.1`) usually points to the device itself, NOT your computer.

### Creating the Frontend `.env` file

1. Open a terminal and find your computer's local network IP address (e.g., `192.168.1.10` or `10.0.2.15`).
   - On Windows, run `ipconfig` and look for the "IPv4 Address" under your Wi-Fi or Ethernet adapter.
2. In the `mobile` folder, create a new file named `.env`.
3. Add the following lines, replacing the IP address with your actual local IP:

```env
# mobile/.env
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000
EXPO_PUBLIC_WS_URL=ws://192.168.x.x:8000
```

> **Why is this important?**
> The Expo app runs on your physical phone or an Android emulator. If you use `localhost`, the phone tries to connect to itself. By using your computer's local IP address, the phone knows how to communicate with the FastAPI backend running on your machine.

---

## 2. Running the Backend (FastAPI)

The backend provides real-time WebSockets, routing via API, and ticket purchasing.

1. Open a terminal and navigate to the `backend` folder.
2. Activate the virtual environment:
   ```powershell
   # Windows
   .\venv\Scripts\activate
   ```
3. Install dependencies (if you haven't already):
   ```powershell
   pip install -r requirements.txt
   ```
4. Start the server:
   ```powershell
   python main.py
   ```
   *You should see the server running at `http://0.0.0.0:8000`.*

---

## 3. Running the Frontend (Mobile App)

1. Open a **new** terminal (keep the backend running in the other one) and navigate to the `mobile` folder.
2. Start Expo:
   ```powershell
   npm start
   ```
3. Press `a` to run it on an Android Emulator, or scan the QR code with the **Expo Go** app on your physical phone (must be on the same Wi-Fi network).

---

## 4. Manual Steps for You (The Developer)

While I've set up the core codebase, local alert engines, routing, and real timetables, there are a few environment-specific tasks you must handle manually:

### Step A: Verify Network Access
If your phone (Expo Go) cannot connect to the backend (you see "Network Error" or it falls back to the local offline engine):
- **Windows Firewall:** Ensure Python is allowed through the Windows Defender Firewall on Private Networks.
- **Same Network:** Ensure both your computer and your phone are connected to the EXACT same Wi-Fi network.

### Step B: Push Notifications (EAS Setup)
Currently, local alerts (boarding reminders, interchange walks) work via our local alert engine. For *remote* push notifications (if you want the backend to push alerts when the app is fully closed):
1. Create an Expo account at [expo.dev](https://expo.dev).
2. Install EAS CLI: `npm install -g eas-cli`
3. Run `eas login` and `eas init` inside the `mobile` folder to link the project.
4. Update `app.json` with the generated `projectId`.

### Step C: Update `.env` when IP changes
If you restart your router or switch networks (e.g., from home Wi-Fi to a coffee shop), your computer's local IP address will change. **You must update `mobile/.env` with the new IP address and restart the Expo server (`npm start`) for the app to connect.**

### Step D: Backend Scraping Enhancements
The backend currently uses static BMRCL data or scrapes a specific page. If the official BMRCL website changes its layout, the BeautifulSoup scraper in `backend/data/scraper.py` will break. You will need to manually inspect the new BMRCL HTML structure and update the CSS selectors in the scraper.

---

## How to Test the Full Flow

1. Start Backend.
2. Start Frontend on Expo Go.
3. Open the **Smart Journey Planner** and search for a route (e.g., Kengeri to Jayanagar).
   - You should see exact timetable options.
4. Click **Buy QR Ticket**.
5. Once purchased, you'll be redirected to the **Ticket Details** screen.
6. The **Journey Companion** will activate. If you purchased a journey that involves an interchange (Purple -> Green), wait for the "Approaching Interchange" and "Deboard Now" local alerts to appear on screen as the countdown hits 0.
7. Scroll down to see the **Connecting Trains at Majestic** panel update in real-time.
