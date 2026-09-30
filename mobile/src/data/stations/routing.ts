/**
 * Offline Dijkstra routing engine + Real Timetable Journey Planner.
 *
 * Uses real per-segment travel times matching the BMRCL schedule and
 * computes all times from the actual Namma Metro timetable — not from
 * wall-clock "now". Departed trains are automatically filtered out.
 */

import { ALL_STATIONS, PURPLE_LINE, GREEN_LINE, YELLOW_LINE, getStationName, getStationById } from './stationData';
import type { RouteSegment } from '../../shared/types';
import {
  TIMETABLE,
  minutesToTimeStr,
  minutesToDate,
  nowMinutes,
  arrivalAtStation,
  timeStrToMinutes,
  type LineId,
  type Direction,
} from './timetable';

// ── Types ──

interface RoutePlan {
  segments: RouteSegment[];
  total_time_minutes: number;
  interchange_count: number;
  fare_estimate: number;
  stations_count: number;
}

export interface UpcomingJourney {
  /** 1-based display index */
  index: number;
  segments: RouteSegment[];
  total_time_minutes: number;
  interchange_count: number;
  fare_estimate: number;
  stations_count: number;
  /** Departure from source (human-readable HH:MM AM/PM) */
  departure_time: string;
  /** Arrival at destination (human-readable HH:MM AM/PM) */
  arrival_time: string;
  /** True if this train hasn't yet departed from source */
  is_available: boolean;
}

// ── Real per-segment travel times ──

const PURPLE_LINE_TIMES: number[] = [
  2, 2, 2, 3, 2, 3, 2, 2, 2, 2, 2, 2, 3, 3,
  2, 2, 2, 2, 2, 2, 3, 2, 3, 2, 2, 3, 2, 2, 2, 2, 2, 2,
];

const GREEN_LINE_TIMES: number[] = [
  3, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 3,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2,
];

const YELLOW_LINE_TIMES: number[] = [
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
];

const INTERCHANGE_WALK_MINUTES = 3; // realistic walk between platforms

// ── Edge weight map ──

const EDGE_TIMES = new Map<string, number>();

function addEdgePair(a: string, b: string, t: number): void {
  EDGE_TIMES.set(`${a}|${b}`, t);
  EDGE_TIMES.set(`${b}|${a}`, t);
}

PURPLE_LINE.forEach((s, i) => {
  if (i < PURPLE_LINE.length - 1) {
    addEdgePair(s.id, PURPLE_LINE[i + 1].id, PURPLE_LINE_TIMES[i] ?? 2);
  }
});

GREEN_LINE.forEach((s, i) => {
  if (i < GREEN_LINE.length - 1) {
    addEdgePair(s.id, GREEN_LINE[i + 1].id, GREEN_LINE_TIMES[i] ?? 2);
  }
});

YELLOW_LINE.forEach((s, i) => {
  if (i < YELLOW_LINE.length - 1) {
    addEdgePair(s.id, YELLOW_LINE[i + 1].id, YELLOW_LINE_TIMES[i] ?? 2);
  }
});

function getEdgeTime(from: string, to: string): number {
  return EDGE_TIMES.get(`${from}|${to}`) ?? 2;
}

// ── Adjacency graph ──

const graph: Record<string, { neighbor: string; time: number; line: string }[]> = {};

ALL_STATIONS.forEach((s) => { graph[s.id] = []; });

function addEdges(lineStations: typeof PURPLE_LINE, lineName: string): void {
  for (let i = 0; i < lineStations.length - 1; i++) {
    const u = lineStations[i].id;
    const v = lineStations[i + 1].id;
    const t = getEdgeTime(u, v);
    graph[u].push({ neighbor: v, time: t, line: lineName });
    graph[v].push({ neighbor: u, time: t, line: lineName });
  }
}

addEdges(PURPLE_LINE, 'purple');
addEdges(GREEN_LINE, 'green');
addEdges(YELLOW_LINE, 'yellow');

// ── Real fare (BMRCL slab system) ──

export function calculateFare(stationCount: number): number {
  const stops = stationCount - 1;
  if (stops <= 2)  return 10;
  if (stops <= 4)  return 15;
  if (stops <= 8)  return 20;
  if (stops <= 12) return 25;
  if (stops <= 18) return 30;
  if (stops <= 24) return 40;
  if (stops <= 32) return 50;
  return 60;
}

// ── Direction helper ──

function getPurpleIdx(id: string): number {
  return PURPLE_LINE.findIndex(s => s.id === id);
}

function getGreenIdx(id: string): number {
  return GREEN_LINE.findIndex(s => s.id === id);
}

function getYellowIdx(id: string): number {
  return YELLOW_LINE.findIndex(s => s.id === id);
}

function getDirection(line: LineId, fromId: string, toId: string): Direction {
  if (line === 'purple') {
    return getPurpleIdx(fromId) <= getPurpleIdx(toId) ? 'forward' : 'reverse';
  } else if (line === 'yellow') {
    return getYellowIdx(fromId) <= getYellowIdx(toId) ? 'forward' : 'reverse';
  }
  return getGreenIdx(fromId) <= getGreenIdx(toId) ? 'forward' : 'reverse';
}

// ── Next train lookup (using real timetable) ──

/**
 * Find upcoming trains at a station, on a given line and direction,
 * departing at/after `afterMinutes` (minutes from midnight).
 *
 * Returns an array of { terminalDep, stationArr } pairs where:
 *   terminalDep — when the train left the terminus
 *   stationArr  — when it arrives at this specific station
 */
export function nextTrainFromStation(
  stationId: string,
  line: LineId,
  direction: Direction,
  afterMinutes: number,
  limit: number = 8,
): { terminalDep: number; stationArr: number }[] {
  const terminalDeps = TIMETABLE[line][direction];
  const lineStations = line === 'purple' ? PURPLE_LINE : GREEN_LINE;
  const totalStations = lineStations.length;

  const stationIdx = line === 'purple' ? getPurpleIdx(stationId) : getGreenIdx(stationId);
  if (stationIdx < 0) return [];

  const results: { terminalDep: number; stationArr: number }[] = [];

  for (const dep of terminalDeps) {
    const arr = arrivalAtStation(line, direction, dep, stationIdx, totalStations);
    if (arr >= afterMinutes) {
      results.push({ terminalDep: dep, stationArr: arr });
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Enrich route segments with real timetable departure/arrival times.
 * Mutates segments in place.
 *
 * @param segments         - Route segments (from Dijkstra)
 * @param startFromMinutes - Earliest acceptable departure at first station
 */
export function enrichSegmentsWithTimetable(
  segments: RouteSegment[],
  startFromMinutes: number,
): void {
  let currentMinute = startFromMinutes;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const line = seg.line as LineId;
    const direction = getDirection(line, seg.from_station_id, seg.to_station_id);

    const nextTrains = nextTrainFromStation(seg.from_station_id, line, direction, currentMinute, 1);

    let depMinute: number;
    if (nextTrains.length > 0) {
      depMinute = nextTrains[0].stationArr;
    } else {
      // No more trains today; fallback so UI stays consistent
      depMinute = currentMinute;
    }

    const arrMinute = depMinute + seg.travel_time_minutes;

    seg.departure_time = minutesToTimeStr(depMinute);
    seg.arrival_time   = minutesToTimeStr(arrMinute);
    seg.departure_iso  = minutesToDate(depMinute).toISOString();
    seg.arrival_iso    = minutesToDate(arrMinute).toISOString();

    // Move clock forward: arrival + interchange walk before next segment
    currentMinute = arrMinute + INTERCHANGE_WALK_MINUTES;
  }
}

// ── Dijkstra (shared by both findRouteOffline and getUpcomingJourneys) ──

function dijkstraPath(sourceId: string, destId: string): {
  path: string[];
  segmentLines: string[];
} | null {
  if (sourceId === destId || !graph[sourceId] || !graph[destId]) return null;

  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const lineAtNode: Record<string, string | null> = {};

  for (const node of Object.keys(graph)) {
    dist[node] = Infinity;
    prev[node] = null;
    lineAtNode[node] = null;
  }

  dist[sourceId] = 0;
  const unvisited = new Set(Object.keys(graph));

  while (unvisited.size > 0) {
    let u: string | null = null;
    let minDist = Infinity;
    for (const node of unvisited) {
      if (dist[node] < minDist) { minDist = dist[node]; u = node; }
    }
    if (u === null || dist[u] === Infinity) break;
    if (u === destId) break;
    unvisited.delete(u);

    for (const edge of graph[u]) {
      if (!unvisited.has(edge.neighbor)) continue;
      let alt = dist[u] + edge.time;
      const prevLine = lineAtNode[u] || edge.line;
      if (prevLine !== edge.line) {
        if (getStationById(u)?.is_interchange) { alt += INTERCHANGE_WALK_MINUTES; }
        else { continue; }
      }
      if (alt < dist[edge.neighbor]) {
        dist[edge.neighbor] = alt;
        prev[edge.neighbor] = u;
        lineAtNode[edge.neighbor] = edge.line;
      }
    }
  }

  if (prev[destId] === null && sourceId !== destId) return null;

  const path: string[] = [];
  let curr: string | null = destId;
  while (curr !== null) { path.unshift(curr); curr = prev[curr]; }
  if (path[0] !== sourceId) return null;

  return { path, segmentLines: [] };
}

function pathToSegments(path: string[]): RouteSegment[] {
  const segments: RouteSegment[] = [];
  let segStart = path[0];
  let segLine = graph[path[0]]?.find(e => e.neighbor === path[1])?.line ?? 'purple';

  if (getStationById(segStart)?.is_interchange && path.length > 1) {
    segLine = graph[segStart].find(e => e.neighbor === path[1])?.line ?? 'purple';
  }

  let segTime = 0;
  let currentSegStations: string[] = [segStart];

  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    const connectingLine = graph[u].find(e => e.neighbor === v)?.line ?? segLine;

    if (getStationById(u)?.is_interchange && connectingLine !== segLine && i > 0) {
      segments.push({
        from_station_id: segStart,
        from_station:    getStationName(segStart),
        to_station_id:   u,
        to_station:      getStationName(u),
        line:            segLine,
        station_ids:     [...currentSegStations],
        stations:        currentSegStations.map(getStationName),
        travel_time_minutes: segTime,
      });
      segStart = u; segLine = connectingLine; segTime = 0;
      currentSegStations = [u];
    }

    segTime += getEdgeTime(u, v);
    currentSegStations.push(v);
  }

  segments.push({
    from_station_id: segStart,
    from_station:    getStationName(segStart),
    to_station_id:   path[path.length - 1],
    to_station:      getStationName(path[path.length - 1]),
    line:            segLine,
    station_ids:     [...currentSegStations],
    stations:        currentSegStations.map(getStationName),
    travel_time_minutes: segTime,
  });

  return segments;
}

// ── Public: offline route (with real timetable times) ──

export function findRouteOffline(sourceId: string, destId: string): RoutePlan | null {
  const result = dijkstraPath(sourceId, destId);
  if (!result) return null;

  const segments = pathToSegments(result.path);
  enrichSegmentsWithTimetable(segments, nowMinutes());

  const stationsCount = result.path.length;
  const fare = calculateFare(stationsCount);
  const interchangeCount = segments.length - 1;
  const travelTime = segments.reduce((s, seg) => s + seg.travel_time_minutes, 0);
  const totalTime = travelTime + interchangeCount * INTERCHANGE_WALK_MINUTES;

  return { segments, total_time_minutes: totalTime, interchange_count: interchangeCount, fare_estimate: fare, stations_count: stationsCount };
}

// ── Public: all upcoming journeys (Smart Journey Planner) ──

/**
 * Get all upcoming train options from source → destination,
 * using real BMRCL timetable data. Departed trains are excluded.
 *
 * For single-line journeys: each available train departure = one option.
 * For interchange journeys: each first-train departure paired with its
 *   optimal connecting second-train = one option.
 *
 * @param sourceId  Station ID of source
 * @param destId    Station ID of destination
 * @param count     Max options to return (default 10)
 */
export function getUpcomingJourneys(
  sourceId: string,
  destId: string,
  count: number = 10,
): UpcomingJourney[] {
  const routeResult = dijkstraPath(sourceId, destId);
  if (!routeResult) return [];

  const baseSegments = pathToSegments(routeResult.path);
  const stationsCount = routeResult.path.length;
  const fare = calculateFare(stationsCount);
  const now = nowMinutes();
  const journeys: UpcomingJourney[] = [];

  if (baseSegments.length === 1) {
    // ── Single-line journey ──
    const seg = baseSegments[0];
    const line = seg.line as LineId;
    const direction = getDirection(line, seg.from_station_id, seg.to_station_id);
    const nextTrains = nextTrainFromStation(seg.from_station_id, line, direction, now, count);

    nextTrains.forEach((train, idx) => {
      const depMin = train.stationArr;
      const arrMin = depMin + seg.travel_time_minutes;

      const enrichedSeg: RouteSegment = {
        ...seg,
        departure_time: minutesToTimeStr(depMin),
        arrival_time:   minutesToTimeStr(arrMin),
        departure_iso:  minutesToDate(depMin).toISOString(),
        arrival_iso:    minutesToDate(arrMin).toISOString(),
      };

      journeys.push({
        index: idx + 1,
        segments: [enrichedSeg],
        total_time_minutes: seg.travel_time_minutes,
        interchange_count: 0,
        fare_estimate: fare,
        stations_count: stationsCount,
        departure_time: minutesToTimeStr(depMin),
        arrival_time:   minutesToTimeStr(arrMin),
        is_available: depMin >= now,
      });
    });

  } else {
    // ── Multi-segment (interchange) journey ──
    const firstSeg = baseSegments[0];
    const lastSeg  = baseSegments[baseSegments.length - 1];
    const firstLine = firstSeg.line as LineId;
    const firstDir  = getDirection(firstLine, firstSeg.from_station_id, firstSeg.to_station_id);
    const lastLine  = lastSeg.line as LineId;
    const lastDir   = getDirection(lastLine, lastSeg.from_station_id, lastSeg.to_station_id);

    const firstTrains = nextTrainFromStation(firstSeg.from_station_id, firstLine, firstDir, now, count);

    firstTrains.forEach((firstTrain, idx) => {
      const firstDepMin = firstTrain.stationArr;
      const firstArrMin = firstDepMin + firstSeg.travel_time_minutes;

      // Find next connecting train after walk at interchange
      const searchConnectFrom = firstArrMin + INTERCHANGE_WALK_MINUTES;
      const connectingTrains = nextTrainFromStation(
        lastSeg.from_station_id, lastLine, lastDir, searchConnectFrom, 1,
      );
      if (connectingTrains.length === 0) return;

      const connectDepMin = connectingTrains[0].stationArr;
      const connectArrMin = connectDepMin + lastSeg.travel_time_minutes;
      const waitAtInterchange = connectDepMin - firstArrMin;
      const totalTime = firstSeg.travel_time_minutes + waitAtInterchange + lastSeg.travel_time_minutes;

      journeys.push({
        index: idx + 1,
        segments: [
          {
            ...firstSeg,
            departure_time: minutesToTimeStr(firstDepMin),
            arrival_time:   minutesToTimeStr(firstArrMin),
            departure_iso:  minutesToDate(firstDepMin).toISOString(),
            arrival_iso:    minutesToDate(firstArrMin).toISOString(),
          },
          {
            ...lastSeg,
            departure_time: minutesToTimeStr(connectDepMin),
            arrival_time:   minutesToTimeStr(connectArrMin),
            departure_iso:  minutesToDate(connectDepMin).toISOString(),
            arrival_iso:    minutesToDate(connectArrMin).toISOString(),
          },
        ],
        total_time_minutes: totalTime,
        interchange_count: 1,
        fare_estimate: fare,
        stations_count: stationsCount,
        departure_time: minutesToTimeStr(firstDepMin),
        arrival_time:   minutesToTimeStr(connectArrMin),
        is_available: firstDepMin >= now,
      });
    });
  }

  return journeys
    .filter(j => j.is_available)
    .sort((a, b) => {
      const aMin = timeStrToMinutes(a.departure_time) ?? 0;
      const bMin = timeStrToMinutes(b.departure_time) ?? 0;
      return aMin - bMin;
    })
    .map((j, i) => ({ ...j, index: i + 1 }))
    .slice(0, count);
}

// ── Public: next N trains from a station (for post-purchase connecting info) ──

/**
 * Get the next N trains from a specific station on a given line/direction.
 * Returns trains that haven't yet departed.
 */
export function getNextTrainsFromStation(
  stationId: string,
  line: LineId,
  direction: Direction,
  count: number = 5,
): { departureTime: string; minutesAway: number; terminalDep: number }[] {
  const now = nowMinutes();
  const trains = nextTrainFromStation(stationId, line, direction, now, count);
  return trains.map(t => ({
    departureTime: minutesToTimeStr(t.stationArr),
    minutesAway:   t.stationArr - now,
    terminalDep:   t.terminalDep,
  }));
}
