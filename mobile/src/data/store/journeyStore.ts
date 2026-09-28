/**
 * Journey Store — Zustand state management for journey tracking.
 *
 * Enhancements:
 *  • For LOCAL journeys (offline): runs the local alert engine + computes
 *    live status and instructions from real timetable times every 30 s.
 *  • For ONLINE journeys: original WebSocket + polling fallback unchanged.
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
import { findRouteOffline, calculateFare } from '../stations/routing';
import { startLocalAlertEngine, stopAlertEngine } from './localAlertEngine';
import { nowMinutes, timeStrToMinutes } from '../stations/timetable';

// ── Types ──

interface JourneyState {
  activeTicket: TicketData | null;
  activeJourneyId: string | null;
  liveStatus: LiveStatus | null;
  alerts: JourneyAlert[];
  segments: RouteSegment[];
  instructions: JourneyInstruction[];
  notificationsEnabled: boolean;
  tickets: TicketData[];
  wsConnected: boolean;
  purchasing: boolean;
  loadingJourney: boolean;

  purchaseTicket: (source: string, destination: string, passengers: number) => Promise<TicketData>;
  startJourneyTracking: (journeyId: string) => void;
  stopJourneyTracking: () => void;
  refreshJourney: (journeyId: string) => Promise<void>;
  clearActiveJourney: () => void;
  toggleNotifications: () => void;
  addAlerts: (newAlerts: JourneyAlert[]) => void;
}

// ── Module-level singletons ──

let activeWs: WebSocket | null = null;
let activeInterval: ReturnType<typeof setInterval> | null = null;
let stopLocalEngine: (() => void) | null = null;

// ── Local live-status computation ──

function computeLocalLiveStatus(segments: RouteSegment[]): LiveStatus | null {
  if (segments.length === 0) return null;
  const now = nowMinutes();

  const firstDep = timeStrToMinutes(segments[0].departure_time);
  const lastArr  = timeStrToMinutes(segments[segments.length - 1].arrival_time);
  if (firstDep === null || lastArr === null) return null;

  const totalMinutes = lastArr - firstDep;
  const elapsed   = Math.max(0, now - firstDep);
  const remaining = Math.max(0, lastArr - now);
  const progress  = totalMinutes > 0 ? Math.min(1, elapsed / totalMinutes) : 0;

  // Determine current segment index
  let currentSegIdx = 0;
  for (let i = 0; i < segments.length; i++) {
    const sd = timeStrToMinutes(segments[i].departure_time);
    const sa = timeStrToMinutes(segments[i].arrival_time);
    if (sd !== null && sa !== null && now >= sd && now <= sa) {
      currentSegIdx = i; break;
    } else if (sa !== null && now > sa) {
      currentSegIdx = Math.min(i + 1, segments.length - 1);
    }
  }

  const currentSeg = segments[currentSegIdx];

  let status: LiveStatus['status'] = 'in_progress';
  if (now < (firstDep)) status = 'boarding';
  if (remaining <= 3 && currentSegIdx === segments.length - 1) status = 'approaching_destination';
  if (now >= lastArr) status = 'completed';
  if (segments.length > 1) {
    const icArr = timeStrToMinutes(segments[0].arrival_time);
    if (icArr !== null && Math.abs(now - icArr) <= 5) status = 'approaching_interchange';
  }

  return {
    progress,
    current_segment: currentSegIdx,
    segment_progress: 0.5,
    current_station:  currentSeg.from_station,
    next_station:     currentSeg.to_station,
    elapsed_minutes:  elapsed,
    remaining_minutes: remaining,
    status,
    total_segments: segments.length,
  };
}

// ── Local instructions computation ──

function computeLocalInstructions(segments: RouteSegment[]): JourneyInstruction[] {
  const now  = nowMinutes();
  const list: JourneyInstruction[] = [];

  for (let si = 0; si < segments.length; si++) {
    const seg    = segments[si];
    const isFirst = si === 0;
    const isLast  = si === segments.length - 1;
    const depMin  = timeStrToMinutes(seg.departure_time);
    const arrMin  = timeStrToMinutes(seg.arrival_time);
    if (depMin === null || arrMin === null) continue;

    const lineName = seg.line.charAt(0).toUpperCase() + seg.line.slice(1);

    // Waiting for first train
    if (isFirst && now < depMin) {
      list.push({
        stage: 'WAITING_FIRST_TRAIN',
        title: `Wait for ${lineName} Line Train`,
        description: `Board the ${lineName} Line train at ${seg.from_station}. Departs at ${seg.departure_time}.`,
        eta_minutes: depMin - now,
        scheduled_time: seg.departure_iso || new Date().toISOString(),
        line: seg.line,
        direction: seg.to_station,
        station: seg.from_station,
        active: true,
        platform: seg.line === 'green' ? 2 : 1,
      });
    }

    // Board first train (≤ 2 min before departure)
    if (isFirst && now >= depMin - 2 && now < depMin) {
      list.push({
        stage: 'BOARD_FIRST_TRAIN',
        title: `Board ${lineName} Line Now!`,
        description: `Train is departing from ${seg.from_station} at ${seg.departure_time}. Board immediately!`,
        eta_minutes: depMin - now,
        scheduled_time: seg.departure_iso || new Date().toISOString(),
        line: seg.line,
        direction: seg.to_station,
        station: seg.from_station,
        active: true,
        platform: seg.line === 'green' ? 2 : 1,
      });
    }

    // In transit — first segment
    if (!isLast && now >= depMin && now < arrMin) {
      list.push({
        stage: 'IN_FIRST_TRAIN',
        title: `On Board — ${lineName} Line`,
        description: `Traveling to Majestic (interchange). Arriving at ${seg.arrival_time}. Prepare to change trains.`,
        eta_minutes: arrMin - now,
        scheduled_time: seg.arrival_iso || new Date().toISOString(),
        line: seg.line,
        direction: seg.to_station,
        station: seg.to_station,
        active: true,
      });
    }

    // In transit — connecting segment
    if (!isFirst && isLast && now >= depMin && now < arrMin) {
      list.push({
        stage: 'IN_CONNECTING_TRAIN',
        title: `On Board — ${lineName} Line`,
        description: `Traveling to ${seg.to_station}. Arriving at ${seg.arrival_time}.`,
        eta_minutes: arrMin - now,
        scheduled_time: seg.arrival_iso || new Date().toISOString(),
        line: seg.line,
        direction: seg.to_station,
        station: seg.to_station,
        active: true,
      });
    }

    // Walk to connecting platform
    if (!isLast && now >= arrMin) {
      const nextSeg   = segments[si + 1];
      const nextDep   = timeStrToMinutes(nextSeg.departure_time);
      const nextLine  = nextSeg.line.charAt(0).toUpperCase() + nextSeg.line.slice(1);
      if (nextDep !== null && now < nextDep) {
        list.push({
          stage: 'WALK_TO_PLATFORM',
          title: `Walk to ${nextLine} Line Platform`,
          description: `You are at Majestic. Walk to the ${nextLine} Line platform. Next train at ${nextSeg.departure_time}.`,
          eta_minutes: nextDep - now,
          scheduled_time: nextSeg.departure_iso || new Date().toISOString(),
          line: nextSeg.line,
          direction: nextSeg.to_station,
          station: 'Majestic',
          active: true,
          platform: nextSeg.line === 'green' ? 2 : 1,
        });
      }
    }

    // Arrived
    if (isLast && now >= arrMin) {
      list.push({
        stage: 'ARRIVED',
        title: `Arrived at ${seg.to_station} 🎯`,
        description: 'You have reached your destination. Thank you for traveling with Namma Metro!',
        eta_minutes: 0,
        scheduled_time: seg.arrival_iso || new Date().toISOString(),
        line: seg.line,
        direction: seg.to_station,
        station: seg.to_station,
        active: true,
      });
    }
  }

  return list;
}

// ── Store ──

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

  addAlerts: (newAlerts: JourneyAlert[]) => {
    if (!get().notificationsEnabled) return;
    set(state => ({
      alerts: [
        ...state.alerts,
        ...newAlerts.filter(a => !state.alerts.some(sa => sa.id === a.id)),
      ],
    }));
  },

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
    } catch (_error) {
      // Offline fallback: build ticket from local timetable
      const now = new Date();
      const ticketId = `${now.toISOString().replace(/\D/g, '').slice(0, 14)}M${Math.random().toString(36).slice(2, 12).toUpperCase()}`;
      const journeyId = `local-${Date.now()}`;
      const sourceName = getStationName(source);
      const destName   = getStationName(destination);

      const offlineRoute = findRouteOffline(source, destination);

      const fallbackData: TicketData = {
        ticket_id: ticketId,
        journey_id: journeyId,
        source: sourceName,
        source_id: source,
        destination: destName,
        destination_id: destination,
        passengers,
        fare: offlineRoute
          ? offlineRoute.fare_estimate * passengers
          : passengers * 30,
        payment_mode: 'UPI',
        transaction_time: now.toLocaleString('en-IN'),
        route: offlineRoute
          ? {
              segments: offlineRoute.segments,
              total_time_minutes: offlineRoute.total_time_minutes,
              interchange_count:  offlineRoute.interchange_count,
              fare_estimate:      offlineRoute.fare_estimate,
              stations_count:     offlineRoute.stations_count,
            }
          : {
              segments: [{
                from_station_id: source,
                from_station:    sourceName,
                to_station_id:   destination,
                to_station:      destName,
                line:            'purple',
                station_ids:     [source, destination],
                stations:        [sourceName, destName],
                travel_time_minutes: 20,
                departure_time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
                arrival_time: new Date(now.getTime() + 20 * 60_000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
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
    // Clean up any existing tracking
    if (activeWs)          { activeWs.close(); activeWs = null; }
    if (activeInterval)    { clearInterval(activeInterval); activeInterval = null; }
    if (stopLocalEngine)   { stopLocalEngine(); stopLocalEngine = null; }

    set({ activeJourneyId: journeyId });

    if (journeyId.startsWith('local-')) {
      // ── LOCAL JOURNEY: client-side alert engine ──

      const segs = get().segments;
      set({
        liveStatus:    computeLocalLiveStatus(segs),
        instructions:  computeLocalInstructions(segs),
      });

      // Start alert engine (fires schedule-accurate alerts)
      stopLocalEngine = startLocalAlertEngine(
        () => get().segments,
        (newAlerts) => {
          if (get().notificationsEnabled) get().addAlerts(newAlerts);
        },
      );

      // Poll live status + instructions every 30 s
      activeInterval = setInterval(() => {
        const currentSegs = get().segments;
        set({
          liveStatus:   computeLocalLiveStatus(currentSegs),
          instructions: computeLocalInstructions(currentSegs),
        });
      }, 30_000);

      return;
    }

    // ── ONLINE JOURNEY: WebSocket + polling fallback ──
    get().refreshJourney(journeyId);

    activeInterval = setInterval(() => {
      if (!get().wsConnected) get().refreshJourney(journeyId);
    }, 10_000);

    try {
      activeWs = connectJourneyWebSocket(
        journeyId,
        (data: unknown) => {
          const update = data as JourneyUpdate;
          if (update.type === 'journey_update') {
            set((state) => ({
              liveStatus: update.live_status || state.liveStatus,
              alerts: state.notificationsEnabled
                ? (update.alerts && update.alerts.length > 0
                    ? [...state.alerts, ...update.alerts.filter(a => !state.alerts.some(sa => sa.id === a.id))]
                    : state.alerts)
                : [],
              instructions: update.instructions && update.instructions.length > 0
                ? update.instructions
                : state.instructions,
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
    } catch (_e) {
      console.warn('WebSocket connection failed, using polling fallback');
      set({ wsConnected: false });
    }
  },

  stopJourneyTracking: () => {
    if (activeWs)        { activeWs.close(); activeWs = null; }
    if (activeInterval)  { clearInterval(activeInterval); activeInterval = null; }
    if (stopLocalEngine) { stopLocalEngine(); stopLocalEngine = null; }
    set({ wsConnected: false });
  },

  refreshJourney: async (journeyId: string) => {
    set({ loadingJourney: true });
    try {
      const data = await getJourney(journeyId);
      set({
        liveStatus:   data.live_status,
        alerts:       get().notificationsEnabled ? data.alerts : [],
        segments:     data.journey.segments,
        instructions: data.instructions || [],
        loadingJourney: false,
      });
    } catch {
      set({ loadingJourney: false });
    }
  },

  clearActiveJourney: () => {
    if (activeWs)        { activeWs.close(); activeWs = null; }
    if (activeInterval)  { clearInterval(activeInterval); activeInterval = null; }
    if (stopLocalEngine) { stopLocalEngine(); stopLocalEngine = null; }
    set({
      activeTicket: null, activeJourneyId: null, liveStatus: null,
      alerts: [], segments: [], instructions: [], wsConnected: false,
    });
  },

  toggleNotifications: () => {
    set(state => ({ notificationsEnabled: !state.notificationsEnabled }));
  },
}));
