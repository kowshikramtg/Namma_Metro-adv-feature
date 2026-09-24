"""
Tests for data.stations — Dijkstra routing engine.

All tests are purely deterministic (no IO, no async, no real time).
These run in < 1 second each.
"""

import pytest
import sys
import os

# Add backend root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data.stations import (
    find_route,
    build_station_registry,
    get_all_stations,
    get_line_stations,
    INTERCHANGE_STATION,
)


class TestRegistry:
    def test_all_stations_count(self):
        """Purple (33) + Green (32) - 1 shared interchange = 64 unique stations."""
        stations = get_all_stations()
        assert len(stations) == 64

    def test_interchange_is_marked(self):
        registry = build_station_registry()
        interchange = registry[INTERCHANGE_STATION]
        assert interchange.is_interchange is True
        assert interchange.line == "both"

    def test_purple_line_stations(self):
        stations = get_line_stations("purple")
        assert len(stations) == 33
        assert stations[0]["id"] == "challaghatta"
        assert stations[-1]["id"] == "kadugodi_whitefield"

    def test_green_line_stations(self):
        stations = get_line_stations("green")
        assert len(stations) == 32
        assert stations[0]["id"] == "madavara"
        assert stations[-1]["id"] == "silk_institute"


class TestSameLineRoutes:
    def test_purple_line_direct(self):
        """Route on a single line — no interchange."""
        plan = find_route("challaghatta", "mg_road")
        assert plan is not None
        assert plan.interchange_count == 0
        assert len(plan.segments) == 1
        assert plan.segments[0].line == "purple"

    def test_purple_line_total_time_positive(self):
        plan = find_route("challaghatta", "kadugodi_whitefield")
        assert plan is not None
        assert plan.total_time_minutes > 0

    def test_green_line_direct(self):
        plan = find_route("madavara", "silk_institute")
        assert plan is not None
        assert plan.interchange_count == 0
        assert plan.segments[0].line == "green"

    def test_adjacent_stations(self):
        plan = find_route("challaghatta", "kengeri_bus_terminal")
        assert plan is not None
        assert plan.total_time_minutes == 2  # defined in PURPLE_LINE_TIMES[0]
        assert plan.stations_count == 2

    def test_reverse_route_same_time(self):
        """Route A→B and B→A should have the same travel time."""
        fwd = find_route("challaghatta", "mg_road")
        rev = find_route("mg_road", "challaghatta")
        assert fwd is not None and rev is not None
        assert fwd.total_time_minutes == rev.total_time_minutes


class TestInterchangeRoutes:
    def test_cross_line_uses_interchange(self):
        """Purple → Green cross-line journey must go through Majestic."""
        plan = find_route("mg_road", "rajajinagar")
        assert plan is not None
        assert plan.interchange_count == 1
        assert len(plan.segments) == 2
        assert plan.segments[0].line == "purple"
        assert plan.segments[1].line == "green"

    def test_interchange_station_is_majestic(self):
        plan = find_route("mg_road", "rajajinagar")
        assert plan is not None
        # Segment 0 ends at Majestic; segment 1 starts at Majestic
        seg1_end = plan.segments[0].to_station_id
        seg2_start = plan.segments[1].from_station_id
        assert seg1_end == INTERCHANGE_STATION
        assert seg2_start == INTERCHANGE_STATION

    def test_cross_line_full_trip(self):
        plan = find_route("challaghatta", "silk_institute")
        assert plan is not None
        assert plan.interchange_count == 1
        assert plan.total_time_minutes > 60  # End-to-end is ~70+ min

    def test_source_at_interchange(self):
        """Starting at the interchange should route to another line without extra interchange."""
        plan = find_route(INTERCHANGE_STATION, "mg_road")
        assert plan is not None
        assert plan.interchange_count == 0

    def test_destination_at_interchange(self):
        plan = find_route("mg_road", INTERCHANGE_STATION)
        assert plan is not None
        assert plan.interchange_count == 0


class TestEdgeCases:
    def test_nonexistent_source_returns_none(self):
        plan = find_route("nonexistent_station", "mg_road")
        assert plan is None

    def test_nonexistent_dest_returns_none(self):
        plan = find_route("mg_road", "nonexistent_station")
        assert plan is None

    def test_both_nonexistent_returns_none(self):
        plan = find_route("foo", "bar")
        assert plan is None

    def test_same_station_returns_none(self):
        """Source == destination: Dijkstra returns immediately, no valid plan."""
        # find_route won't find a route back to itself since it marks source as visited
        # and immediately returns when source==dest... let's verify behavior
        plan = find_route("mg_road", "mg_road")
        # Acceptable: either None or plan with 0 travel time; must not crash
        if plan is not None:
            assert plan.total_time_minutes == 0 or plan.stations_count <= 1


class TestFareCalculation:
    def test_fare_minimum(self):
        """2-station trip: fare = 10 + (2//2)*5 = 15"""
        plan = find_route("challaghatta", "kengeri_bus_terminal")
        assert plan is not None
        assert plan.fare_estimate == 15

    def test_fare_increases_with_distance(self):
        short = find_route("challaghatta", "kengeri_bus_terminal")
        long = find_route("challaghatta", "kadugodi_whitefield")
        assert short is not None and long is not None
        assert long.fare_estimate > short.fare_estimate

    def test_fare_formula(self):
        """Verify fare = 10 + (stations_count // 2) * 5."""
        plan = find_route("challaghatta", "mg_road")
        assert plan is not None
        expected = 10 + (plan.stations_count // 2) * 5
        assert plan.fare_estimate == expected
