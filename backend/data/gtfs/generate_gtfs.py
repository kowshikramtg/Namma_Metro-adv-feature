"""
Script to generate standard GTFS CSV dataset for Namma Metro (Purple & Green Lines).
"""
import os
import csv
from datetime import datetime, timedelta, time

gtfs_dir = os.path.dirname(__file__)

# 1. agency.txt
agency_path = os.path.join(gtfs_dir, "agency.txt")
with open(agency_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["agency_id", "agency_name", "agency_url", "agency_timezone", "agency_lang"])
    writer.writerow(["BMRC", "Namma Metro (BMRCL)", "https://www.bmrc.co.in", "Asia/Kolkata", "en"])

# 2. routes.txt
routes_path = os.path.join(gtfs_dir, "routes.txt")
with open(routes_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["route_id", "agency_id", "route_short_name", "route_long_name", "route_type", "route_color"])
    writer.writerow(["purple", "BMRC", "Purple", "Purple Line (Challaghatta - Kadugodi)", "1", "7B2D8E"])
    writer.writerow(["green", "BMRC", "Green", "Green Line (Madavara - Silk Institute)", "1", "4CAF50"])

# 3. stops.txt
PURPLE_LINE_STATIONS = [
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

GREEN_LINE_STATIONS = [
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

PURPLE_LINE_TIMES = [
    2, 2, 2, 3, 2, 3, 2, 2, 2, 2, 2, 2, 3, 3,
    2, 2, 2, 2, 2, 2, 3, 2, 3, 2, 2, 3, 2, 2, 2, 2, 2, 2
]

GREEN_LINE_TIMES = [
    3, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 3,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2
]

stops_path = os.path.join(gtfs_dir, "stops.txt")
stops = {}
for sid, name in PURPLE_LINE_STATIONS + GREEN_LINE_STATIONS:
    stops[sid] = name

with open(stops_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["stop_id", "stop_name", "stop_lat", "stop_lon"])
    for sid, name in stops.items():
        writer.writerow([sid, name, "12.9716", "77.5946"])

# 4. calendar.txt
calendar_path = os.path.join(gtfs_dir, "calendar.txt")
with open(calendar_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["service_id", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "start_date", "end_date"])
    writer.writerow(["WEEKDAY", "1", "1", "1", "1", "1", "0", "0", "20260101", "20261231"])
    writer.writerow(["WEEKEND", "0", "0", "0", "0", "0", "1", "1", "20260101", "20261231"])

# 5. trips.txt & 6. stop_times.txt
trips_path = os.path.join(gtfs_dir, "trips.txt")
stop_times_path = os.path.join(gtfs_dir, "stop_times.txt")

trips = []
stop_times = []

def generate_trips_for_line(route_id, stations, segment_times, service_id):
    # Operating hours: 05:00 to 23:00
    start_dt = datetime(2026, 1, 1, 5, 0, 0)
    end_dt = datetime(2026, 1, 1, 23, 0, 0)

    trip_count = 0
    curr = start_dt

    while curr <= end_dt:
        # Frequency based on time of day
        h = curr.hour
        if service_id == "WEEKDAY":
            if 7 <= h < 10 or 17 <= h < 20:
                freq = 4
            elif 10 <= h < 17:
                freq = 6
            else:
                freq = 10
        else:
            if 7 <= h < 10 or 17 <= h < 20:
                freq = 6
            elif 10 <= h < 17:
                freq = 8
            else:
                freq = 12

        trip_id = f"TRIP_{route_id.upper()}_{service_id}_{curr.strftime('%H%M')}"
        trips.append([route_id, service_id, trip_id, f"Headsign {route_id}", "0"])

        # Generate stop times
        t_curr = curr
        for idx, (sid, sname) in enumerate(stations):
            arr_str = t_curr.strftime("%H:%M:%S")
            dep_str = (t_curr + timedelta(seconds=30)).strftime("%H:%M:%S") if idx < len(stations) - 1 else arr_str
            stop_times.append([trip_id, arr_str, dep_str, sid, str(idx + 1)])

            if idx < len(segment_times):
                t_curr += timedelta(minutes=segment_times[idx])

        curr += timedelta(minutes=freq)
        trip_count += 1

generate_trips_for_line("purple", PURPLE_LINE_STATIONS, PURPLE_LINE_TIMES, "WEEKDAY")
generate_trips_for_line("purple", PURPLE_LINE_STATIONS, PURPLE_LINE_TIMES, "WEEKEND")
generate_trips_for_line("green", GREEN_LINE_STATIONS, GREEN_LINE_TIMES, "WEEKDAY")
generate_trips_for_line("green", GREEN_LINE_STATIONS, GREEN_LINE_TIMES, "WEEKEND")

with open(trips_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["route_id", "service_id", "trip_id", "trip_headsign", "direction_id"])
    writer.writerows(trips)

with open(stop_times_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence"])
    writer.writerows(stop_times)

print(f"Generated GTFS files successfully: {len(trips)} trips, {len(stop_times)} stop_times.")
