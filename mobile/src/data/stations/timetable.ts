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

export type LineId = 'purple' | 'green' | 'yellow';
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

const YELLOW_SEG_TIMES: number[] = [
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
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

/** Cumulative travel time from terminal (index 0) to station[idx] on Yellow Line. */
export function cumulativeYellow(idx: number): number {
  let acc = 0;
  for (let i = 0; i < idx && i < YELLOW_SEG_TIMES.length; i++) {
    acc += YELLOW_SEG_TIMES[i];
  }
  return acc;
}

// ── Exact Official BMRCL Frequencies ──

type TimeBlock = { from: string; to: string; freq: number };

const PURPLE_CHALLAGHATTA_MON: TimeBlock[] = [
  { from: "04:15", to: "04:35", freq: 20 }, { from: "04:35", to: "05:15", freq: 15 },
  { from: "05:15", to: "06:54", freq: 11 }, { from: "06:54", to: "12:20", freq: 10 },
  { from: "12:20", to: "16:45", freq: 8 },  { from: "16:45", to: "23:05", freq: 10 }
];
const PURPLE_CHALLAGHATTA_TUE_FRI: TimeBlock[] = [
  { from: "05:00", to: "05:20", freq: 20 }, { from: "05:20", to: "06:00", freq: 15 },
  { from: "06:00", to: "06:54", freq: 11 }, { from: "06:54", to: "12:20", freq: 10 },
  { from: "12:20", to: "16:02", freq: 8 },  { from: "16:02", to: "23:05", freq: 10 }
];
const PURPLE_CHALLAGHATTA_SAT: TimeBlock[] = [
  { from: "05:00", to: "05:20", freq: 20 }, { from: "05:20", to: "06:00", freq: 15 },
  { from: "06:00", to: "06:54", freq: 11 }, { from: "06:54", to: "12:20", freq: 10 },
  { from: "12:20", to: "16:45", freq: 8 },  { from: "16:45", to: "23:05", freq: 10 }
];
const PURPLE_CHALLAGHATTA_SUN: TimeBlock[] = [
  { from: "07:00", to: "07:50", freq: 15 }, { from: "07:50", to: "12:00", freq: 10 },
  { from: "12:00", to: "21:28", freq: 8 },  { from: "21:28", to: "23:05", freq: 10 }
];

const PURPLE_WHITEFIELD_MON: TimeBlock[] = [
  { from: "04:15", to: "04:35", freq: 20 }, { from: "04:35", to: "05:00", freq: 13 },
  { from: "05:00", to: "10:57", freq: 10 }, { from: "10:57", to: "15:21", freq: 8 },
  { from: "15:21", to: "22:01", freq: 10 }, { from: "22:01", to: "22:45", freq: 15 }
];
const PURPLE_WHITEFIELD_TUE_FRI: TimeBlock[] = [
  { from: "05:00", to: "05:20", freq: 20 }, { from: "05:20", to: "10:57", freq: 10 },
  { from: "10:57", to: "15:21", freq: 8 },  { from: "15:21", to: "22:01", freq: 10 },
  { from: "22:01", to: "22:45", freq: 15 }
];
const PURPLE_WHITEFIELD_SAT: TimeBlock[] = PURPLE_WHITEFIELD_TUE_FRI;
const PURPLE_WHITEFIELD_SUN: TimeBlock[] = [
  { from: "07:00", to: "10:33", freq: 10 }, { from: "10:33", to: "20:01", freq: 8 },
  { from: "20:01", to: "22:31", freq: 10 }, { from: "22:31", to: "22:45", freq: 14 }
];

const GREEN_MADAVARA_MON: TimeBlock[] = [
  { from: "04:15", to: "04:40", freq: 25 }, { from: "05:00", to: "06:15", freq: 15 },
  { from: "06:15", to: "10:25", freq: 10 }, { from: "10:25", to: "10:39", freq: 7 },
  { from: "10:39", to: "15:51", freq: 8 },  { from: "15:51", to: "19:44", freq: 10 },
  { from: "19:44", to: "20:24", freq: 8 },  { from: "20:24", to: "22:04", freq: 10 },
  { from: "22:04", to: "22:40", freq: 10 }, { from: "22:40", to: "22:57", freq: 15 }
];
const GREEN_MADAVARA_TUE_FRI: TimeBlock[] = [
  { from: "05:00", to: "06:15", freq: 15 }, { from: "06:15", to: "10:25", freq: 11 },
  { from: "10:25", to: "10:39", freq: 7 },  { from: "10:39", to: "15:51", freq: 8 },
  { from: "15:51", to: "19:44", freq: 10 }, { from: "19:44", to: "20:24", freq: 8 },
  { from: "20:24", to: "22:04", freq: 10 }, { from: "22:04", to: "22:40", freq: 10 },
  { from: "22:40", to: "22:57", freq: 15 }
];
const GREEN_MADAVARA_SAT: TimeBlock[] = [
  { from: "05:00", to: "06:15", freq: 15 }, { from: "06:15", to: "10:39", freq: 11 },
  { from: "10:39", to: "16:01", freq: 8 },  { from: "16:01", to: "16:23", freq: 5.5 },
  { from: "16:23", to: "19:52", freq: 11 }, { from: "19:52", to: "20:24", freq: 8 },
  { from: "20:24", to: "22:04", freq: 10 }, { from: "22:04", to: "23:00", freq: 15 }
];
const GREEN_MADAVARA_SUN: TimeBlock[] = [
  { from: "07:00", to: "10:47", freq: 10 }, { from: "10:47", to: "20:15", freq: 8 },
  { from: "20:15", to: "22:05", freq: 10 }, { from: "22:05", to: "22:29", freq: 12 },
  { from: "22:29", to: "23:00", freq: 15 }
];

const GREEN_SILK_INSTITUTE_MON: TimeBlock[] = [
  { from: "04:15", to: "05:00", freq: 20 }, { from: "05:00", to: "07:00", freq: 15 },
  { from: "07:00", to: "11:09", freq: 10 }, { from: "11:09", to: "16:48", freq: 8 },
  { from: "16:48", to: "20:29", freq: 10 }, { from: "20:29", to: "21:30", freq: 8 },
  { from: "21:30", to: "22:40", freq: 10 }, { from: "22:40", to: "23:05", freq: 12.5 }
];
const GREEN_SILK_INSTITUTE_TUE_FRI: TimeBlock[] = [
  { from: "05:00", to: "07:00", freq: 15 }, { from: "07:00", to: "11:09", freq: 10 },
  { from: "11:09", to: "16:48", freq: 8 },  { from: "16:48", to: "20:29", freq: 10 },
  { from: "20:29", to: "21:30", freq: 8 },  { from: "21:30", to: "22:40", freq: 10 },
  { from: "22:40", to: "23:05", freq: 12.5 }
];
const GREEN_SILK_INSTITUTE_SAT: TimeBlock[] = [
  { from: "05:00", to: "07:00", freq: 15 }, { from: "07:00", to: "11:53", freq: 11 },
  { from: "11:53", to: "16:48", freq: 8 },  { from: "16:48", to: "20:57", freq: 11 },
  { from: "20:57", to: "21:30", freq: 8 },  { from: "21:30", to: "22:40", freq: 10 },
  { from: "22:40", to: "23:05", freq: 12.5 }
];
const GREEN_SILK_INSTITUTE_SUN: TimeBlock[] = [
  { from: "07:00", to: "07:58", freq: 15 }, { from: "07:58", to: "12:08", freq: 10 },
  { from: "12:08", to: "21:44", freq: 8 },  { from: "21:44", to: "22:44", freq: 10 },
  { from: "22:44", to: "23:05", freq: 12 }
];

const YELLOW_RV_ROAD_MON: TimeBlock[] = [
  { from: "05:05", to: "05:35", freq: 30 }, { from: "05:35", to: "06:00", freq: 25 },
  { from: "06:00", to: "06:40", freq: 20 }, { from: "06:40", to: "06:56", freq: 16 },
  { from: "06:56", to: "07:07", freq: 11 }, { from: "07:07", to: "08:27", freq: 10 },
  { from: "08:27", to: "09:15", freq: 8 },  { from: "09:15", to: "09:29", freq: 7 },
  { from: "09:29", to: "10:47", freq: 6 },  { from: "10:47", to: "10:55", freq: 8 },
  { from: "10:55", to: "11:04", freq: 9 },  { from: "11:04", to: "16:34", freq: 10 },
  { from: "16:34", to: "16:41", freq: 7 },  { from: "16:41", to: "20:11", freq: 6 },
  { from: "20:11", to: "21:07", freq: 8 },  { from: "21:07", to: "21:57", freq: 10 },
  { from: "21:57", to: "22:10", freq: 13 }, { from: "22:10", to: "22:40", freq: 15 },
  { from: "22:40", to: "23:55", freq: 25 }
];
const YELLOW_RV_ROAD_TUE_FRI: TimeBlock[] = [
  { from: "06:00", to: "06:40", freq: 20 }, { from: "06:40", to: "06:56", freq: 16 },
  { from: "06:56", to: "07:07", freq: 11 }, { from: "07:07", to: "08:27", freq: 10 },
  { from: "08:27", to: "09:15", freq: 8 },  { from: "09:15", to: "09:29", freq: 7 },
  { from: "09:29", to: "10:47", freq: 6 },  { from: "10:47", to: "10:55", freq: 8 },
  { from: "10:55", to: "11:04", freq: 9 },  { from: "11:04", to: "16:34", freq: 10 },
  { from: "16:34", to: "16:41", freq: 7 },  { from: "16:41", to: "20:11", freq: 6 },
  { from: "20:11", to: "21:07", freq: 8 },  { from: "21:07", to: "21:57", freq: 10 },
  { from: "21:57", to: "22:10", freq: 13 }, { from: "22:10", to: "22:40", freq: 15 },
  { from: "22:40", to: "23:55", freq: 25 }
];
const YELLOW_RV_ROAD_SAT: TimeBlock[] = [
  { from: "06:00", to: "06:25", freq: 20 }, { from: "06:25", to: "07:05", freq: 20 },
  { from: "07:05", to: "07:20", freq: 15 }, { from: "07:20", to: "07:31", freq: 11 },
  { from: "07:31", to: "20:31", freq: 10 }, { from: "20:31", to: "22:07", freq: 12 },
  { from: "22:07", to: "22:25", freq: 18 }, { from: "22:25", to: "23:05", freq: 20 },
  { from: "23:05", to: "23:55", freq: 25 }
];
const YELLOW_RV_ROAD_SUN: TimeBlock[] = [
  { from: "07:00", to: "08:48", freq: 18 }, { from: "08:48", to: "09:58", freq: 14 },
  { from: "09:58", to: "10:46", freq: 12 }, { from: "10:46", to: "20:56", freq: 10 },
  { from: "20:56", to: "22:20", freq: 12 }, { from: "22:20", to: "22:50", freq: 15 },
  { from: "22:50", to: "23:30", freq: 20 }, { from: "23:30", to: "23:55", freq: 25 }
];

const YELLOW_BOMMASANDRA_MON: TimeBlock[] = [
  { from: "05:05", to: "05:35", freq: 30 }, { from: "05:35", to: "06:00", freq: 20 },
  { from: "06:00", to: "06:20", freq: 20 }, { from: "06:20", to: "07:50", freq: 10 },
  { from: "07:50", to: "08:38", freq: 8 },  { from: "08:38", to: "08:52", freq: 7 },
  { from: "08:52", to: "10:10", freq: 6 },  { from: "10:10", to: "10:18", freq: 8 },
  { from: "10:18", to: "15:58", freq: 10 }, { from: "15:58", to: "19:34", freq: 6 },
  { from: "19:34", to: "20:30", freq: 8 },  { from: "20:30", to: "21:30", freq: 10 },
  { from: "21:30", to: "22:42", freq: 12 }
];
const YELLOW_BOMMASANDRA_TUE_FRI: TimeBlock[] = [
  { from: "06:00", to: "06:20", freq: 20 }, { from: "06:20", to: "07:50", freq: 10 },
  { from: "07:50", to: "08:38", freq: 8 },  { from: "08:38", to: "08:52", freq: 7 },
  { from: "08:52", to: "10:10", freq: 6 },  { from: "10:10", to: "10:18", freq: 8 },
  { from: "10:18", to: "15:58", freq: 10 }, { from: "15:58", to: "19:34", freq: 6 },
  { from: "19:34", to: "20:30", freq: 8 },  { from: "20:30", to: "21:30", freq: 10 },
  { from: "21:30", to: "22:42", freq: 12 }
];
const YELLOW_BOMMASANDRA_SAT: TimeBlock[] = [
  { from: "06:00", to: "06:40", freq: 20 }, { from: "06:40", to: "06:55", freq: 15 },
  { from: "06:55", to: "19:55", freq: 10 }, { from: "19:55", to: "22:31", freq: 12 },
  { from: "22:31", to: "22:42", freq: 11 }
];
const YELLOW_BOMMASANDRA_SUN: TimeBlock[] = [
  { from: "07:00", to: "08:12", freq: 18 }, { from: "08:12", to: "09:08", freq: 14 },
  { from: "09:08", to: "10:20", freq: 12 }, { from: "10:20", to: "20:20", freq: 10 },
  { from: "20:20", to: "22:32", freq: 12 }, { from: "22:32", to: "22:42", freq: 10 }
];

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function generateDepartures(blocks: TimeBlock[]): number[] {
  const times: number[] = [];
  for (const block of blocks) {
    let t = timeToMins(block.from);
    const end = timeToMins(block.to);
    while (t < end) {
      times.push(Math.round(t));
      t += block.freq;
    }
  }
  return [...new Set(times)].sort((a, b) => a - b);
}

function getTimetableForToday() {
  const day = new Date().getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  let pC, pW, gM, gS, yR, yB;
  if (day === 0) {
    pC = PURPLE_CHALLAGHATTA_SUN; pW = PURPLE_WHITEFIELD_SUN;
    gM = GREEN_MADAVARA_SUN; gS = GREEN_SILK_INSTITUTE_SUN;
    yR = YELLOW_RV_ROAD_SUN; yB = YELLOW_BOMMASANDRA_SUN;
  } else if (day === 1) {
    pC = PURPLE_CHALLAGHATTA_MON; pW = PURPLE_WHITEFIELD_MON;
    gM = GREEN_MADAVARA_MON; gS = GREEN_SILK_INSTITUTE_MON;
    yR = YELLOW_RV_ROAD_MON; yB = YELLOW_BOMMASANDRA_MON;
  } else if (day === 6) {
    pC = PURPLE_CHALLAGHATTA_SAT; pW = PURPLE_WHITEFIELD_SAT;
    gM = GREEN_MADAVARA_SAT; gS = GREEN_SILK_INSTITUTE_SAT;
    yR = YELLOW_RV_ROAD_SAT; yB = YELLOW_BOMMASANDRA_SAT;
  } else {
    pC = PURPLE_CHALLAGHATTA_TUE_FRI; pW = PURPLE_WHITEFIELD_TUE_FRI;
    gM = GREEN_MADAVARA_TUE_FRI; gS = GREEN_SILK_INSTITUTE_TUE_FRI;
    yR = YELLOW_RV_ROAD_TUE_FRI; yB = YELLOW_BOMMASANDRA_TUE_FRI;
  }

  return {
    purple: { forward: generateDepartures(pC), reverse: generateDepartures(pW) },
    green:  { forward: generateDepartures(gM), reverse: generateDepartures(gS) },
    yellow: { forward: generateDepartures(yR), reverse: generateDepartures(yB) }
  };
}

export const TIMETABLE = getTimetableForToday();

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
