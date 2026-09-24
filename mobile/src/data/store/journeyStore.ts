/**
 * Journey Store — Zustand state management for journey tracking.
 * Manages tickets, active journeys, and WebSocket connections.
 */

import { create } from 'zustand';
import type {
  TicketData,
  LiveStatus,
  JourneyAlert,
  JourneyUpdate,
  RouteSegment,
  JourneyInstruction,
} from '../../shared/types';
import {
  purchaseTicket as apiPurchaseTicket,
  getJourney,
  connectJourneyWebSocket,
} from '../api/metroApi';
import { ALL_STATIONS, getStationName } from '../stations/stationData';
import { findRouteOffline } from '../stations/routing';

interface JourneyState {
  // Active ticket & journey
  activeTicket: TicketData | null;
  activeJourneyId: string | null;
  liveStatus: LiveStatus | null;
  alerts: JourneyAlert[];
  segments: RouteSegment[];
  instructions: JourneyInstruction[];

  // User Settings
  notificationsEnabled: boolean;

  // Ticket history
  tickets: TicketData[];

  // WebSocket
  wsConnected: boolean;

  // Loading states
  purchasing: boolean;
  loadingJourney: boolean;

  // Actions
  purchaseTicket: (source: string, destination: string, passengers: number) => Promise<TicketData>;
  startJourneyTracking: (journeyId: string) => void;
  stopJourneyTracking: () => void;
  refreshJourney: (journeyId: string) => Promise<void>;
  clearActiveJourney: () => void;
  toggleNotifications: () => void;
}

let activeWs: WebSocket | null = null;
let activeInterval: ReturnType<typeof setInterval> | null = null;

export const useJourneyStore = create<JourneyState>((set, get) => ({
  activeTicket: null,
  activeJourneyId: null,
  liveStatus: null,
  alerts: [],
  segments: [],
  instructions: [],
  tickets: [],
  wsConnected: false,
  purchasing: false,
  loadingJourney: false,
  notificationsEnabled: true,

  purchaseTicket: async (source, destination, passengers) => {
    set({ purchasing: true });
    try {
      const data = await apiPurchaseTicket(source, destination, passengers);
      set({
        activeTicket: data,
        activeJourneyId: data.journey_id,
        segments: data.route.segments,
        tickets: [...get().tickets, data],
        purchasing: false,
      });
      return data;
    } catch (error) {
      // Fallback: generate local ticket data
      const now = new Date();
      const ticketId = `${now.toISOString().replace(/\D/g, '').slice(0, 14)}M${Math.random().toString(36).slice(2, 12).toUpperCase()}`;
      const journeyId = `local-${Date.now()}`;
      const sourceName = getStationName(source);
      const destName = getStationName(destination);

      const offlineRoute = findRouteOffline(source, destination);

      const fallbackData: TicketData = {
        ticket_id: ticketId,
        journey_id: journeyId,
        source: sourceName,
        source_id: source,
        destination: destName,
        destination_id: destination,
        passengers,
        fare: offlineRoute ? offlineRoute.fare_estimate * passengers : passengers * 30,
        payment_mode: 'UPI',
        transaction_time: now.toLocaleString('en-IN'),
        route: offlineRoute ? {
          segments: offlineRoute.segments,
          total_time_minutes: offlineRoute.total_time_minutes,
          interchange_count: offlineRoute.interchange_count,
          fare_estimate: offlineRoute.fare_estimate,
          stations_count: offlineRoute.stations_count,
        } : {
          segments: [{
            from_station_id: source,
            from_station: sourceName,
            to_station_id: destination,
            to_station: destName,
            line: 'purple',
            station_ids: [source, destination],
            stations: [sourceName, destName],
            travel_time_minutes: 20,
            departure_time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
            arrival_time: new Date(now.getTime() + 20 * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
          }],
          total_time_minutes: 20,
          interchange_count: 0,
          fare_estimate: 30,
          stations_count: 2,
        },
      };

      set({
        activeTicket: fallbackData,
        activeJourneyId: journeyId,
        segments: fallbackData.route.segments,
        tickets: [...get().tickets, fallbackData],
        purchasing: false,
      });
      return fallbackData;
    }
  },

  startJourneyTracking: (journeyId: string) => {
    // Close any existing WebSocket
    if (activeWs) {
      activeWs.close();
      activeWs = null;
    }
    if (activeInterval) {
      clearInterval(activeInterval);
      activeInterval = null;
    }

    set({ activeJourneyId: journeyId });

    if (journeyId.startsWith('local-')) {
      // Offline journey, do not attempt WS or polling
      return;
    }

    // Initial fetch to immediately populate the single source of truth
    get().refreshJourney(journeyId);

    // Setup centralized fallback polling
    activeInterval = setInterval(() => {
      // Only poll if WS is disconnected to save network/battery, 
      // or always poll as a solid fallback. We'll poll every 10s.
      if (!get().wsConnected) {
        get().refreshJourney(journeyId);
      }
    }, 10000);

    try {
      activeWs = connectJourneyWebSocket(
        journeyId,
        (data: unknown) => {
          const update = data as JourneyUpdate;
          if (update.type === 'journey_update') {
            set((state) => ({
              liveStatus: update.live_status || state.liveStatus,
              alerts: state.notificationsEnabled 
                ? (update.alerts && update.alerts.length > 0 ? [...state.alerts, ...update.alerts.filter(a => !state.alerts.some(sa => sa.id === a.id))] : state.alerts)
                : [],
              instructions: update.instructions && update.instructions.length > 0 ? update.instructions : state.instructions,
            }));
          } else if (update.type === 'journey_complete') {
            set({
              liveStatus: {
                ...get().liveStatus!,
                status: 'completed',
                progress: 1.0,
                remaining_minutes: 0,
              },
            });
          }
        },
        () => set({ wsConnected: false }),
        () => set({ wsConnected: false }),
      );
      set({ wsConnected: true });
    } catch (e) {
      console.warn('WebSocket connection failed, using polling fallback');
      set({ wsConnected: false });
    }
  },

  stopJourneyTracking: () => {
    if (activeWs) {
      activeWs.close();
      activeWs = null;
    }
    if (activeInterval) {
      clearInterval(activeInterval);
      activeInterval = null;
    }
    set({ wsConnected: false });
  },

  refreshJourney: async (journeyId: string) => {
    set({ loadingJourney: true });
    try {
      const data = await getJourney(journeyId);
      set({
        liveStatus: data.live_status,
        alerts: get().notificationsEnabled ? data.alerts : [],
        segments: data.journey.segments,
        instructions: data.instructions || [],
        loadingJourney: false,
      });
    } catch {
      set({ loadingJourney: false });
    }
  },

  clearActiveJourney: () => {
    if (activeWs) {
      activeWs.close();
      activeWs = null;
    }
    if (activeInterval) {
      clearInterval(activeInterval);
      activeInterval = null;
    }
    set({
      activeTicket: null,
      activeJourneyId: null,
      liveStatus: null,
      alerts: [],
      segments: [],
      instructions: [],
      wsConnected: false,
    });
  },

  toggleNotifications: () => {
    set((state) => ({ notificationsEnabled: !state.notificationsEnabled }));
  },
}));
