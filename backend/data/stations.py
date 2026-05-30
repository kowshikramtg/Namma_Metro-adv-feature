"""
Namma Metro Station Data & Route Engine

Complete station graph for Bangalore Metro:
  - Purple Line (East-West): 33 stations, Challaghatta → Kadugodi (Whitefield)
  - Green Line (North-South): 32 stations, Madavara → Silk Institute
  - Interchange: Nadaprabhu Kempegowda Station Majestic

Route computation uses Dijkstra's algorithm on the station adjacency graph.
Travel times are sourced from the data provider layer.
"""

import heapq
from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel


class Station(BaseModel):
    id: str
    name: str
    line: str            # "purple", "green", or "both"
    order: int           # Position on line
    is_interchange: bool = False


class RouteSegment(BaseModel):
    from_station_id: str
    from_station: str
    to_station_id: str
    to_station: str
    line: str
    station_ids: List[str]
    stations: List[str]
    travel_time_minutes: int
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None


class JourneyPlan(BaseModel):
    segments: List[RouteSegment]
    total_time_minutes: int
    interchange_count: int
    fare_estimate: int
    stations_count: int


# ── Purple Line Stations (West → East) — 33 stations ──
PURPLE_LINE_STATIONS: List[Tuple[str, str]] = [
    ("challaghatta", "Challaghatta"),
    ("kengeri_bus_terminal", "Kengeri Bus Terminal"),
    ("kengeri", "Kengeri"),
    ("pattanagere", "Pattanagere"),
    ("jnanabharathi", "Jnanabharathi"),
    ("rajarajeshwari_nagar", "Rajarajeshwari Nagar"),
    ("nayandahalli", "Nayandahalli"),
    ("mysore_road", "Mysore Road"),
    ("deepanjali_nagar", "Deepanjali Nagar"),
    ("attiguppe", "Attiguppe"),
    ("vijayanagar", "Vijayanagar"),
    ("hosahalli", "Hosahalli"),
    ("magadi_road", "Magadi Road"),
    ("city_railway_station", "City Railway Station"),
    ("nadaprabhu_kempegowda_majestic", "Nadaprabhu Kempegowda Station Majestic"),
    ("sir_m_visvesvaraya_central_college", "Sir M. Visvesvaraya Station Central College"),
    ("dr_br_ambedkar_vidhana_soudha", "Dr. B.R. Ambedkar Station Vidhana Soudha"),
    ("cubbon_park", "Cubbon Park"),
    ("mg_road", "MG Road"),
    ("trinity", "Trinity"),
    ("halasuru", "Halasuru"),
    ("indiranagar", "Indiranagar"),
    ("swami_vivekananda_road", "Swami Vivekananda Road"),
    ("baiyappanahalli", "Baiyappanahalli"),
    ("benniganahalli", "Benniganahalli"),
    ("hoodi", "Hoodi"),
    ("garudacharpalya", "Garudacharpalya"),
    ("mahadevapura", "Mahadevapura"),
    ("krishnarajapura", "Krishnarajapura"),
    ("seetharampalya", "Seetharampalya"),
    ("hoodi_junction", "Hoodi Junction"),
    ("channasandra", "Channasandra"),
    ("kadugodi_whitefield", "Kadugodi (Whitefield)"),
]

# ── Green Line Stations (North → South) — 32 stations ──
GREEN_LINE_STATIONS: List[Tuple[str, str]] = [
    ("madavara", "Madavara"),
    ("chikkabidarakallu", "Chikkabidarakallu"),
    ("manjunathanagar", "Manjunathanagar"),
    ("nagasandra", "Nagasandra"),
    ("dasarahalli", "Dasarahalli"),
    ("jalahalli", "Jalahalli"),
    ("peenya_industry", "Peenya Industry"),
    ("peenya", "Peenya"),
    ("goraguntepalya", "Goraguntepalya"),
    ("yeshwanthpur", "Yeshwanthpur"),
    ("sandal_soap_factory", "Sandal Soap Factory"),
    ("mahalakshmi", "Mahalakshmi"),
    ("rajajinagar", "Rajajinagar"),
    ("mahakavi_kuvempu_road", "Mahakavi Kuvempu Road"),
    ("srirampura", "Srirampura"),
    ("sampige_road", "Sampige Road"),
    ("nadaprabhu_kempegowda_majestic", "Nadaprabhu Kempegowda Station Majestic"),
    ("chickpete", "Chickpete"),
    ("krishna_rajendra_market", "Krishna Rajendra Market"),
    ("national_college", "National College"),
    ("lalbagh", "Lalbagh"),
    ("south_end_circle", "South End Circle"),
    ("jayanagar", "Jayanagar"),
    ("rashtreeya_vidyalaya_road", "Rashtreeya Vidyalaya Road"),
    ("banashankari", "Banashankari"),
    ("jaya_prakash_nagar", "Jaya Prakash Nagar"),
    ("yelachenahalli", "Yelachenahalli"),
    ("konanakunte_cross", "Konanakunte Cross"),
    ("doddakallasandra", "Doddakallasandra"),
    ("vajarahalli", "Vajarahalli"),
    ("thalaghattapura", "Thalaghattapura"),
    ("silk_institute", "Silk Institute"),
]

# Travel time between adjacent stations (minutes)
# These are used for the adjacency graph and must match the data provider
PURPLE_LINE_TIMES = [
    2, 2, 2, 3, 2, 3, 2, 2, 2, 2, 2, 2, 3, 3,
    2, 2, 2, 2, 2, 2, 3, 2, 3, 2, 2, 3, 2, 2, 2, 2, 2, 2
]

GREEN_LINE_TIMES = [
    3, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 3,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2
]

INTERCHANGE_STATION = "nadaprabhu_kempegowda_majestic"
INTERCHANGE_WALK_MINUTES = 2


def build_station_registry() -> Dict[str, Station]:
    """Build a dictionary of all stations keyed by ID."""
    registry: Dict[str, Station] = {}

    for i, (sid, name) in enumerate(PURPLE_LINE_STATIONS):
        registry[sid] = Station(
            id=sid, name=name,
            line="both" if sid == INTERCHANGE_STATION else "purple",
            order=i,
            is_interchange=(sid == INTERCHANGE_STATION),
        )

    for i, (sid, name) in enumerate(GREEN_LINE_STATIONS):
        if sid == INTERCHANGE_STATION:
            registry[sid].line = "both"
            registry[sid].is_interchange = True
        elif sid not in registry:
            registry[sid] = Station(
                id=sid, name=name, line="green",
                order=i, is_interchange=False,
            )

    return registry


def build_adjacency() -> Dict[str, List[Tuple[str, int, str]]]:
    """
    Build adjacency list for the metro graph.
    Returns: station_id -> [(neighbor_id, travel_time_minutes, line)]
    """
    adj: Dict[str, List[Tuple[str, int, str]]] = {}

    def add_edge(a: str, b: str, t: int, line: str):
        adj.setdefault(a, []).append((b, t, line))
        adj.setdefault(b, []).append((a, t, line))

    for i in range(len(PURPLE_LINE_STATIONS) - 1):
        add_edge(
            PURPLE_LINE_STATIONS[i][0],
            PURPLE_LINE_STATIONS[i + 1][0],
            PURPLE_LINE_TIMES[i],
            "purple",
        )

    for i in range(len(GREEN_LINE_STATIONS) - 1):
        add_edge(
            GREEN_LINE_STATIONS[i][0],
            GREEN_LINE_STATIONS[i + 1][0],
            GREEN_LINE_TIMES[i],
            "green",
        )

    return adj


def get_station_line(station_id: str) -> str:
    """Determine which line a station belongs to."""
    if station_id == INTERCHANGE_STATION:
        return "both"
    for sid, _ in PURPLE_LINE_STATIONS:
        if sid == station_id:
            return "purple"
    for sid, _ in GREEN_LINE_STATIONS:
        if sid == station_id:
            return "green"
    return "unknown"


def get_line_for_edge(adj: Dict, from_id: str, to_id: str) -> Optional[str]:
    """Get the line for an edge between two adjacent stations."""
    for neighbor, _, line in adj.get(from_id, []):
        if neighbor == to_id:
            return line
    return None


def find_route(source: str, dest: str) -> Optional[JourneyPlan]:
    """
    Find optimal route between two stations using Dijkstra's algorithm.
    Handles same-line and cross-line (interchange) journeys.
    Never hardcodes route outputs — always computed from the graph.
    """
    adj = build_adjacency()
    registry = build_station_registry()

    if source not in adj or dest not in adj:
        return None

    # Dijkstra: (cost, station_id, path_of_station_ids)
    heap: List[Tuple[int, str, List[str]]] = [(0, source, [source])]
    visited: set = set()

    while heap:
        cost, node, path = heapq.heappop(heap)

        if node in visited:
            continue
        visited.add(node)

        if node == dest:
            return _build_journey_plan(path, adj, registry)

        for neighbor, travel_time, line in adj[node]:
            if neighbor not in visited:
                # Add interchange penalty if switching lines
                extra_cost = 0
                if len(path) >= 2:
                    prev_line = get_line_for_edge(adj, path[-2], path[-1])
                    if prev_line and prev_line != line and node == INTERCHANGE_STATION:
                        extra_cost = INTERCHANGE_WALK_MINUTES

                heapq.heappush(
                    heap,
                    (cost + travel_time + extra_cost, neighbor, path + [neighbor])
                )

    return None


def _build_journey_plan(
    path: List[str],
    adj: Dict[str, List[Tuple[str, int, str]]],
    registry: Dict[str, Station],
) -> JourneyPlan:
    """Build a JourneyPlan from a path of station IDs."""
    segments: List[RouteSegment] = []
    current_line: Optional[str] = None
    seg_start = 0

    for i in range(1, len(path)):
        edge_line = get_line_for_edge(adj, path[i - 1], path[i])

        if current_line is None:
            current_line = edge_line

        if edge_line != current_line:
            # Line changed at an interchange — finalize previous segment
            seg_ids = path[seg_start:i]
            seg_time = _compute_segment_time(seg_ids, adj, current_line)
            segments.append(RouteSegment(
                from_station_id=seg_ids[0],
                from_station=registry[seg_ids[0]].name,
                to_station_id=seg_ids[-1],
                to_station=registry[seg_ids[-1]].name,
                line=current_line or "purple",
                station_ids=seg_ids,
                stations=[registry[s].name for s in seg_ids],
                travel_time_minutes=seg_time,
            ))
            seg_start = i - 1  # Interchange station is shared
            current_line = edge_line

    # Final segment
    seg_ids = path[seg_start:]
    seg_time = _compute_segment_time(seg_ids, adj, current_line)
    segments.append(RouteSegment(
        from_station_id=seg_ids[0],
        from_station=registry[seg_ids[0]].name,
        to_station_id=seg_ids[-1],
        to_station=registry[seg_ids[-1]].name,
        line=current_line or "purple",
        station_ids=seg_ids,
        stations=[registry[s].name for s in seg_ids],
        travel_time_minutes=seg_time,
    ))

    interchange_count = len(segments) - 1
    total_travel = sum(s.travel_time_minutes for s in segments)
    total_time = total_travel + (interchange_count * INTERCHANGE_WALK_MINUTES)

    # Fare estimation: ₹10 base + ₹5 per 2 stations (BMRC approximate)
    total_stations = len(path)
    fare = 10 + ((total_stations // 2) * 5)

    return JourneyPlan(
        segments=segments,
        total_time_minutes=total_time,
        interchange_count=interchange_count,
        fare_estimate=fare,
        stations_count=total_stations,
    )


def _compute_segment_time(
    station_ids: List[str],
    adj: Dict[str, List[Tuple[str, int, str]]],
    line: Optional[str],
) -> int:
    """Compute total travel time for a segment of stations."""
    total = 0
    for j in range(len(station_ids) - 1):
        for neighbor, t, l in adj[station_ids[j]]:
            if neighbor == station_ids[j + 1]:
                total += t
                break
    return total


def get_all_stations() -> List[dict]:
    """Return all stations as a flat list for frontend consumption."""
    registry = build_station_registry()
    stations = []
    seen = set()

    for i, (sid, name) in enumerate(PURPLE_LINE_STATIONS):
        stations.append({
            "id": sid,
            "name": name,
            "line": registry[sid].line,
            "order": i,
            "is_interchange": sid == INTERCHANGE_STATION,
        })
        seen.add(sid)

    for i, (sid, name) in enumerate(GREEN_LINE_STATIONS):
        if sid not in seen:
            stations.append({
                "id": sid,
                "name": name,
                "line": "green",
                "order": i,
                "is_interchange": False,
            })

    return stations


def get_line_stations(line: str) -> List[dict]:
    """Return stations for a specific line in order."""
    source = PURPLE_LINE_STATIONS if line == "purple" else GREEN_LINE_STATIONS
    return [{"id": sid, "name": name, "order": i} for i, (sid, name) in enumerate(source)]
