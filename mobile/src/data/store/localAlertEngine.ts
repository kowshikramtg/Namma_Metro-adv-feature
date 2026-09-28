/**
 * Local Alert Engine — Client-side journey alert generation.
 *
 * Fires JourneyAlert objects for local (offline) journeys where
 * the WebSocket / backend is unavailable. All timings come from
 * the real BMRCL timetable, so alerts are schedule-accurate.
 *
 * Alert types generated:
 *  • boarding_reminder       — 3 min before first train departs
 *  • approaching_interchange — 5 min before arriving at Majestic
 *  • deboard_interchange     — 1-2 min before arriving at Majestic
 *  • walk_directions         — after deboard: platform navigation
 *  • connecting_trains       — list of next Green/Purple trains at Majestic
 *  • approaching_destination — 3 min before final arrival
 *  • arrived                 — on final arrival
 */

import type { JourneyAlert, RouteSegment } from '../../shared/types';
import { nowMinutes, timeStrToMinutes, type LineId, type Direction } from '../stations/timetable';
import { getNextTrainsFromStation } from '../stations/routing';

// ── State (module-level singletons) ──

const firedAlerts: Record<string, boolean> = {};
let engineInterval: ReturnType<typeof setInterval> | null = null;

// ── Helpers ──

function parseTime(timeStr: string | undefined): number | null {
  if (!timeStr) return null;
  return timeStrToMinutes(timeStr);
}

function makeAlert(
  type: string,
  title: string,
  message: string,
  detail: string,
  icon: string,
  color: string,
  priority: 'high' | 'medium' | 'low',
): JourneyAlert {
  return {
    id: `local-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    icon,
    title,
    message,
    detail,
    color,
    priority,
    timestamp: new Date().toISOString(),
  };
}

function directionFromSegment(seg: RouteSegment): Direction {
  // We lazy-require stationData to avoid circular deps at module init time
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PURPLE_LINE, GREEN_LINE } = require('../stations/stationData');
  if (seg.line === 'purple') {
    const fi = PURPLE_LINE.findIndex((s: { id: string }) => s.id === seg.from_station_id);
    const ti = PURPLE_LINE.findIndex((s: { id: string }) => s.id === seg.to_station_id);
    return fi <= ti ? 'forward' : 'reverse';
  } else {
    const fi = GREEN_LINE.findIndex((s: { id: string }) => s.id === seg.from_station_id);
    const ti = GREEN_LINE.findIndex((s: { id: string }) => s.id === seg.to_station_id);
    return fi <= ti ? 'forward' : 'reverse';
  }
}

// ── Core: compute alerts for a given snapshot of segments ──

/**
 * Inspect the current time vs segment schedule and return
 * any alerts that are newly due and haven't been fired yet.
 */
export function computeJourneyAlerts(segments: RouteSegment[]): JourneyAlert[] {
  const now = nowMinutes();
  const newAlerts: JourneyAlert[] = [];

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    const isFirst = si === 0;
    const isLast  = si === segments.length - 1;

    const depMin = parseTime(seg.departure_time);
    const arrMin = parseTime(seg.arrival_time);
    if (depMin === null || arrMin === null) continue;

    const lineColor = seg.line === 'green' ? '#4CAF50' : '#7B2D8E';
    const lineName  = seg.line.charAt(0).toUpperCase() + seg.line.slice(1);

    // ── 1. BOARDING REMINDER (3 min before departure) ──
    const boardKey = `board_${si}`;
    if (!firedAlerts[boardKey] && depMin - now <= 3 && depMin - now >= 0) {
      firedAlerts[boardKey] = true;
      const direction = directionFromSegment(seg);
      const dirLabel  = direction === 'forward' ? '→' : '←';
      newAlerts.push(makeAlert(
        'boarding_reminder',
        `🚇 Board ${lineName} Line — ${depMin - now} min`,
        `Train to ${seg.to_station} departs from ${seg.from_station} at ${seg.departure_time}`,
        `Direction ${dirLabel} ${seg.to_station} · Platform: ${seg.line === 'green' ? 'Green' : 'Purple'} Line`,
        '🚇', lineColor, 'high',
      ));
    }

    // ── 2. IN TRANSIT ALERTS ──
    if (depMin !== null && now > depMin && arrMin !== null && now < arrMin) {

      if (!isLast) {
        // ── 2a. APPROACHING INTERCHANGE (5 min before arrival) ──
        const approachKey = `approach_ic_${si}`;
        if (!firedAlerts[approachKey] && arrMin - now <= 5 && arrMin - now > 2) {
          firedAlerts[approachKey] = true;
          const nextSeg   = segments[si + 1];
          const nextLine  = nextSeg.line.charAt(0).toUpperCase() + nextSeg.line.slice(1);
          newAlerts.push(makeAlert(
            'approaching_interchange',
            '🔄 Prepare to Change Trains',
            `Arriving at Majestic (interchange) in ${arrMin - now} min`,
            `Get ready to deboard · Walk ~3 min to ${nextLine} Line platform`,
            '🔄', '#FF9800', 'high',
          ));
        }

        // ── 2b. DEBOARD + WALK DIRECTIONS (1-2 min before arrival) ──
        const deboardKey = `deboard_${si}`;
        if (!firedAlerts[deboardKey] && arrMin - now <= 2 && arrMin - now >= 0) {
          firedAlerts[deboardKey] = true;

          const nextSeg      = segments[si + 1];
          const nextLine     = nextSeg.line as LineId;
          const nextLineName = nextSeg.line.charAt(0).toUpperCase() + nextSeg.line.slice(1);
          const nextColor    = nextLine === 'green' ? '#4CAF50' : '#7B2D8E';

          const walkGuide = nextLine === 'green'
            ? 'Exit Purple Line platform → Follow GREEN LINE signs → Cross concourse → Green Line platform'
            : 'Exit Green Line platform → Follow PURPLE LINE signs → Cross concourse → Purple Line platform';

          newAlerts.push(makeAlert(
            'deboard_interchange',
            `⬇️ Deboard Now — Majestic`,
            `Arriving in ${arrMin - now} min · Change to ${nextLineName} Line towards ${nextSeg.to_station}`,
            walkGuide,
            '⬇️', nextColor, 'high',
          ));

          // ── 2c. CONNECTING TRAINS LIST ──
          const connectDir   = directionFromSegment(nextSeg);
          const connectTrains = getNextTrainsFromStation(
            nextSeg.from_station_id, nextLine, connectDir, 4,
          );

          if (connectTrains.length > 0) {
            const trainList = connectTrains
              .slice(0, 4)
              .map(t => `${t.departureTime} (${t.minutesAway <= 0 ? 'Now' : `${t.minutesAway} min`})`)
              .join('  ·  ');

            newAlerts.push(makeAlert(
              'connecting_trains',
              `🚈 ${nextLineName} Line Trains at Majestic`,
              `Towards ${nextSeg.to_station}: ${trainList}`,
              `Your booked train: ${nextSeg.departure_time}`,
              '🚈', nextColor, 'high',
            ));
          }
        }
      }

      // ── 3. APPROACHING DESTINATION (3 min before final arrival) ──
      if (isLast) {
        const approachDestKey = `approach_dest_${si}`;
        if (!firedAlerts[approachDestKey] && arrMin - now <= 3 && arrMin - now > 0) {
          firedAlerts[approachDestKey] = true;
          newAlerts.push(makeAlert(
            'approaching_destination',
            `🎯 Approaching ${seg.to_station}`,
            `Arriving at your destination in ${arrMin - now} min`,
            'Prepare to deboard. Thank you for traveling with Namma Metro! 🙏',
            '🎯', '#4CAF50', 'medium',
          ));
        }
      }
    }

    // ── 4. ARRIVED AT DESTINATION ──
    if (isLast && arrMin !== null) {
      const arrivedKey = `arrived_${si}`;
      if (!firedAlerts[arrivedKey] && now >= arrMin && now <= arrMin + 3) {
        firedAlerts[arrivedKey] = true;
        newAlerts.push(makeAlert(
          'arrived',
          `✅ Arrived at ${seg.to_station}!`,
          'You have reached your destination.',
          'Thank you for traveling with Namma Metro! 🙏',
          '✅', '#4CAF50', 'high',
        ));
      }
    }
  }

  return newAlerts;
}

// ── Public API ──

/** Reset the engine — call when starting a fresh journey. */
export function resetAlertEngine(): void {
  Object.keys(firedAlerts).forEach(k => delete firedAlerts[k]);
}

/** Stop the polling interval and reset state. */
export function stopAlertEngine(): void {
  if (engineInterval) { clearInterval(engineInterval); engineInterval = null; }
  resetAlertEngine();
}

/**
 * Start the local alert engine.
 *
 * Checks alerts immediately, then every 30 seconds.
 *
 * @param getSegments   - Live getter for current route segments (from store)
 * @param onNewAlerts   - Callback invoked whenever new alerts are generated
 * @returns             - A stop function; call it to cancel polling
 */
export function startLocalAlertEngine(
  getSegments: () => RouteSegment[],
  onNewAlerts: (alerts: JourneyAlert[]) => void,
): () => void {
  stopAlertEngine(); // clean previous run

  const check = () => {
    const segs = getSegments();
    if (segs.length === 0) return;
    const fresh = computeJourneyAlerts(segs);
    if (fresh.length > 0) onNewAlerts(fresh);
  };

  check(); // immediate check
  engineInterval = setInterval(check, 30_000); // then every 30 s

  return stopAlertEngine;
}
