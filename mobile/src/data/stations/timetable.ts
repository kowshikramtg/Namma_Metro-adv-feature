/**
 * Real Namma Metro Timetable Data.
 * Based on official Bangalore Metro Rail Corporation (BMRCL) schedule.
 * Purple Line: Challaghatta ↔ Kadugodi (Whitefield)
 * Green Line:  Madavara ↔ Silk Institute
 *
 * Frequencies:
 *   Peak   (7–10 AM, 5–9 PM IST): 10 min intervals
 *   Off-Peak:                      15 min intervals
 *   First train: ~05:00 AM | Last train: ~22:50 PM
 */

export type LineId = 'purple' | 'green';
export type Direction = 'forward' | 'reverse';

/** A single scheduled service on one line, one direction. */
export interface TrainService {
  /** Minutes from midnight, e.g. 5:00 AM = 300 */
  departureMinutes: number;
  direction: Direction;
  line: LineId;
}

// ── Real per-segment travel times (must match routing.ts) ──

const PURPLE_SEG_TIMES: number[] = [
  2, 2, 2, 3, 2, 3, 2, 2, 2, 2, 2, 2, 3, 3,
  2, 2, 2, 2, 2, 2, 3, 2, 3, 2, 2, 3, 2, 2, 2, 2, 2, 2,
];

const GREEN_SEG_TIMES: number[] = [
  3, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 3,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2,
];

/** Cumulative travel time from terminal (index 0) to station[idx] on Purple Line. */
export function cumulativePurple(idx: number): number {
  let acc = 0;
  for (let i = 0; i < idx && i < PURPLE_SEG_TIMES.length; i++) {
    acc += PURPLE_SEG_TIMES[i];
  }
  return acc;
}

/** Cumulative travel time from terminal (index 0) to station[idx] on Green Line. */
export function cumulativeGreen(idx: number): number {
  let acc = 0;
  for (let i = 0; i < idx && i < GREEN_SEG_TIMES.length; i++) {
    acc += GREEN_SEG_TIMES[i];
  }
  return acc;
}

/**
 * Generate all terminal departure times (minutes from midnight)
 * following the real BMRCL peak/off-peak schedule.
 *
 * Peak:     7:00–9:59 AM (420–599 min)  and  17:00–20:59 PM (1020–1259 min) → 10 min
 * Off-peak: all other slots → 15 min
 */
function generateDepartures(firstMinute: number, lastMinute: number): number[] {
  const times: number[] = [];
  let t = firstMinute;
  while (t <= lastMinute) {
    times.push(t);
    const hour = Math.floor(t / 60) % 24;
    const isPeak = (hour >= 7 && hour < 10) || (hour >= 17 && hour < 21);
    t += isPeak ? 10 : 15;
  }
  return times;
}

// Purple line — terminal departures
// Forward:  Challaghatta (order 0) → Kadugodi/Whitefield (order 32)
// Reverse:  Kadugodi/Whitefield    → Challaghatta
export const PURPLE_FORWARD_DEPS: number[] = generateDepartures(5 * 60,       22 * 60 + 45);
export const PURPLE_REVERSE_DEPS: number[] = generateDepartures(5 * 60,       22 * 60 + 45);

// Green line — terminal departures
// Forward:  Madavara (order 0) → Silk Institute (order 31)
// Reverse:  Silk Institute     → Madavara
export const GREEN_FORWARD_DEPS: number[] = generateDepartures(5 * 60 + 5,   22 * 60 + 50);
export const GREEN_REVERSE_DEPS: number[] = generateDepartures(5 * 60 + 5,   22 * 60 + 50);

export const TIMETABLE = {
  purple: { forward: PURPLE_FORWARD_DEPS, reverse: PURPLE_REVERSE_DEPS },
  green:  { forward: GREEN_FORWARD_DEPS,  reverse: GREEN_REVERSE_DEPS  },
};

// ── Utility functions ──

/**
 * Convert minutes-from-midnight to a 12-hour formatted string.
 * e.g. 300 → "05:00 AM",  754 → "12:34 PM"
 */
export function minutesToTimeStr(minutes: number): string {
  const totalMin = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60); // normalise
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Convert minutes-from-midnight to a Date object (today's date).
 */
export function minutesToDate(minutes: number): Date {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  base.setMinutes(base.getMinutes() + minutes);
  return base;
}

/**
 * Get the current time as minutes from midnight (local time).
 */
export function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Parse a formatted time string back to minutes from midnight.
 * Accepts "HH:MM AM/PM" (12-hour) format.
 * Returns null if unparseable.
 */
export function timeStrToMinutes(timeStr: string | undefined): number | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(' ');
  if (parts.length < 2) return null;
  const [hm, period] = [parts[0], parts[1].toUpperCase()];
  const [hStr, mStr] = hm.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;
  let h24 = h;
  if (period === 'PM' && h !== 12) h24 = h + 12;
  if (period === 'AM' && h === 12) h24 = 0;
  return h24 * 60 + m;
}

/**
 * Given a station's index along the line array and a terminal departure time,
 * compute the minute at which the train arrives at that station.
 *
 * @param line           - 'purple' | 'green'
 * @param direction      - 'forward' (index 0 → N) | 'reverse' (index N → 0)
 * @param terminalDepMin - The terminal departure time in minutes from midnight
 * @param stationIdx     - Station's index in the line array (0-based, in forward order)
 * @param totalStations  - Total number of stations on the line
 */
export function arrivalAtStation(
  line: LineId,
  direction: Direction,
  terminalDepMin: number,
  stationIdx: number,
  totalStations: number,
): number {
  let travelFromTerminal: number;

  if (line === 'purple') {
    if (direction === 'forward') {
      // Terminal is Challaghatta (idx 0); count forward
      travelFromTerminal = cumulativePurple(stationIdx);
    } else {
      // Terminal is Kadugodi (idx 32); train goes backward, so
      // effective position from that terminal = (total-1) - stationIdx
      const effectiveIdx = (totalStations - 1) - stationIdx;
      travelFromTerminal = cumulativePurple(effectiveIdx);
    }
  } else {
    if (direction === 'forward') {
      travelFromTerminal = cumulativeGreen(stationIdx);
    } else {
      const effectiveIdx = (totalStations - 1) - stationIdx;
      travelFromTerminal = cumulativeGreen(effectiveIdx);
    }
  }

  return terminalDepMin + travelFromTerminal;
}
