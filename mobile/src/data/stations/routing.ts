/**
 * Offline Dijkstra routing engine.
 *
 * Uses real per-segment travel times (same source data as the backend's
 * PURPLE_LINE_TIMES / GREEN_LINE_TIMES arrays) so offline route times
 * match what the server would compute.
 *
 * Falls back to 2 minutes for any edge not found in the lookup table
 * (should never happen if stationData stays in sync).
 */

import { ALL_STATIONS, PURPLE_LINE, GREEN_LINE, getStationName, getStationLine } from './stationData';
import type { RouteSegment } from '../../shared/types';

interface RoutePlan {
  segments: RouteSegment[];
  total_time_minutes: number;
  interchange_count: number;
  fare_estimate: number;
  stations_count: number;
}

// ── Real station-to-station travel times (minutes) ──
// These must stay in sync with backend/data/stations.py PURPLE_LINE_TIMES / GREEN_LINE_TIMES.

const PURPLE_LINE_TIMES: number[] = [
  2, 2, 2, 3, 2, 3, 2, 2, 2, 2, 2, 2, 3, 3,
  2, 2, 2, 2, 2, 2, 3, 2, 3, 2, 2, 3, 2, 2, 2, 2, 2, 2,
];

const GREEN_LINE_TIMES: number[] = [
  3, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 3,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2,
];

const INTERCHANGE_STATION = 'nadaprabhu_kempegowda_majestic';
const INTERCHANGE_WALK_MINUTES = 2;

// Build edge weight lookup: 'stationA|stationB' → minutes
const EDGE_TIMES = new Map<string, number>();

function addEdgePair(a: string, b: string, t: number) {
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

function getEdgeTime(from: string, to: string): number {
  return EDGE_TIMES.get(`${from}|${to}`) ?? 2;
}

// ── Adjacency graph ──
const graph: Record<string, { neighbor: string; time: number; line: string }[]> = {};

ALL_STATIONS.forEach((s) => {
  graph[s.id] = [];
});

const addEdges = (lineStations: typeof PURPLE_LINE, lineName: string) => {
  for (let i = 0; i < lineStations.length - 1; i++) {
    const u = lineStations[i].id;
    const v = lineStations[i + 1].id;
    const t = getEdgeTime(u, v);
    graph[u].push({ neighbor: v, time: t, line: lineName });
    graph[v].push({ neighbor: u, time: t, line: lineName });
  }
};

addEdges(PURPLE_LINE, 'purple');
addEdges(GREEN_LINE, 'green');

// ── Dijkstra ──
export function findRouteOffline(sourceId: string, destId: string): RoutePlan | null {
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
    // Pick the unvisited node with minimum distance
    let u: string | null = null;
    let minDist = Infinity;
    for (const node of unvisited) {
      if (dist[node] < minDist) {
        minDist = dist[node];
        u = node;
      }
    }

    if (u === null || dist[u] === Infinity) break;
    if (u === destId) break;
    unvisited.delete(u);

    for (const edge of graph[u]) {
      if (!unvisited.has(edge.neighbor)) continue;

      let alt = dist[u] + edge.time;

      const prevLine = lineAtNode[u] || edge.line;
      if (prevLine !== edge.line) {
        // Line switches are only allowed at the interchange station
        if (u === INTERCHANGE_STATION) {
          alt += INTERCHANGE_WALK_MINUTES;
        } else {
          continue; // Can't switch lines elsewhere
        }
      }

      if (alt < dist[edge.neighbor]) {
        dist[edge.neighbor] = alt;
        prev[edge.neighbor] = u;
        lineAtNode[edge.neighbor] = edge.line;
      }
    }
  }

  if (prev[destId] === null && sourceId !== destId) return null;

  // Reconstruct path
  const path: string[] = [];
  let curr: string | null = destId;
  while (curr !== null) {
    path.unshift(curr);
    curr = prev[curr];
  }

  if (path[0] !== sourceId) return null;

  // ── Split path into line segments ──
  const segments: RouteSegment[] = [];
  let segStart: string = path[0];
  let segLine: string =
    graph[path[0]]?.find((e) => e.neighbor === path[1])?.line ?? 'purple';

  // Handle starting at the interchange
  if (segStart === INTERCHANGE_STATION && path.length > 1) {
    segLine = graph[segStart].find((e) => e.neighbor === path[1])?.line ?? 'purple';
  }

  let segTime = 0;
  let currentSegStations: string[] = [segStart];

  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    const connectingLine = graph[u].find((e) => e.neighbor === v)?.line ?? segLine;

    // Detect line change at interchange
    if (u === INTERCHANGE_STATION && connectingLine !== segLine && i > 0) {
      segments.push({
        from_station_id: segStart,
        from_station: getStationName(segStart),
        to_station_id: u,
        to_station: getStationName(u),
        line: segLine,
        station_ids: [...currentSegStations],
        stations: currentSegStations.map(getStationName),
        travel_time_minutes: segTime,
      });

      segStart = u;
      segLine = connectingLine;
      segTime = 0;
      currentSegStations = [u];
    }

    segTime += getEdgeTime(u, v);
    currentSegStations.push(v);
  }

  // Final segment
  segments.push({
    from_station_id: segStart,
    from_station: getStationName(segStart),
    to_station_id: path[path.length - 1],
    to_station: getStationName(path[path.length - 1]),
    line: segLine,
    station_ids: [...currentSegStations],
    stations: currentSegStations.map(getStationName),
    travel_time_minutes: segTime,
  });

  // ── Enrich with departure/arrival times ──
  let currentTime = new Date();
  segments.forEach((seg, idx) => {
    seg.departure_time = currentTime.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
    currentTime = new Date(currentTime.getTime() + seg.travel_time_minutes * 60_000);
    seg.arrival_time = currentTime.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
    if (idx < segments.length - 1) {
      // Add interchange walk time between segments
      currentTime = new Date(currentTime.getTime() + INTERCHANGE_WALK_MINUTES * 60_000);
    }
  });

  const stationsCount = path.length;
  const fare = 10 + Math.floor(stationsCount / 2) * 5;
  const interchangeCount = segments.length - 1;
  const travelTime = segments.reduce((s, seg) => s + seg.travel_time_minutes, 0);
  const totalTime = travelTime + interchangeCount * INTERCHANGE_WALK_MINUTES;

  return {
    segments,
    total_time_minutes: totalTime,
    interchange_count: interchangeCount,
    fare_estimate: fare,
    stations_count: stationsCount,
  };
}
