/**
 * Route Planner Screen — Plan routes without ticket purchase.
 * Uses graph-based routing from the backend.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Header } from '../../shared/components/Header';
import { StationSelector } from '../../shared/components/StationSelector';
import { planJourney } from '../../data/api/metroApi';
import { getStationName } from '../../data/stations/stationData';
import { findRouteOffline } from '../../data/stations/routing';
import { colors, spacing, borderRadius, shadows } from '../../navigation/theme';
import type { JourneyPlanResponse, RouteSegment } from '../../shared/types';
import { useRouteStore } from './routeStore';

export default function RoutePlannerScreen() {
  const [source, setSource] = useState('');
  const [dest, setDest] = useState('');
  const [result, setResult] = useState<JourneyPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { cacheRoute, getCachedRoute } = useRouteStore();

  const swapStations = () => {
    const tmp = source;
    setSource(dest);
    setDest(tmp);
    setResult(null);
  };

  const handleSearch = async () => {
    if (!source || !dest) return;
    setLoading(true);
    setError('');

    try {
      const data = await planJourney(source, dest);
      setResult(data);
      cacheRoute(source, dest, data);
    } catch (e) {
      // Try cached route
      const cached = getCachedRoute(source, dest);
      if (cached) {
        setResult(cached);
        setError('Offline mode: Showing cached route data.');
      } else {
        // Fallback to offline graph routing
        const offlineRoute = findRouteOffline(source, dest);
        if (offlineRoute) {
          const fallbackData = { route: offlineRoute, next_trains: [] };
          setResult(fallbackData);
          cacheRoute(source, dest, fallbackData);
          setError('Offline mode: Using offline routing estimation.');
        } else {
          setError('Could not connect to server and no offline route found.');
          setResult(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Smart Journey Planner" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧭 Plan Your Route</Text>
          <Text style={styles.cardSubtitle}>
            Find the best route with schedule-computed timings
          </Text>

          <View style={{ position: 'relative' }}>
            <StationSelector
              label="Source Station"
              value={source}
              onChange={(v) => { setSource(v); setResult(null); }}
              excludeId={dest}
            />
            <View style={{ height: spacing.lg }} />
            <StationSelector
              label="Destination Station"
              value={dest}
              onChange={(v) => { setDest(v); setResult(null); }}
              excludeId={source}
            />
            <TouchableOpacity style={styles.swapBtn} onPress={swapStations}>
              <Text style={styles.swapIcon}>⇅</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, (!source || !dest || loading) && { opacity: 0.6 }]}
            onPress={handleSearch}
            disabled={!source || !dest || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.neutral[0]} />
            ) : (
              <Text style={styles.btnText}>Find Routes</Text>
            )}
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {result && (
          <View style={[styles.card, { marginTop: 0, padding: 0, overflow: 'hidden' }]}>
            {/* Result Header */}
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Recommended Route</Text>
              <View style={styles.fastestBadge}>
                <Text style={styles.fastestText}>Fastest</Text>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>
                  {result.route.total_time_minutes}
                  <Text style={{ fontSize: 12 }}> min</Text>
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Stations</Text>
                <Text style={styles.statValue}>{result.route.stations_count}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Fare</Text>
                <Text style={styles.statValue}>₹{result.route.fare_estimate}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Changes</Text>
                <Text style={[
                  styles.statValue,
                  { color: result.route.interchange_count > 0 ? colors.status.warning : colors.status.success },
                ]}>
                  {result.route.interchange_count}
                </Text>
              </View>
            </View>

            {/* Route Segments */}
            <View style={{ padding: spacing.lg }}>
              {result.route.segments.map((seg: RouteSegment, i: number) => {
                const lineColor = seg.line === 'green' ? colors.green[500] : colors.purple[600];
                return (
                  <View key={i} style={[styles.segmentContainer, { borderLeftColor: lineColor }]}>
                    <Text style={[styles.lineTitle, { color: lineColor }]}>
                      {seg.line} Line
                    </Text>
                    <View style={styles.stationRow}>
                      <View style={[styles.dot, { backgroundColor: lineColor }]} />
                      <Text style={styles.stationName}>{seg.from_station}</Text>
                      <Text style={styles.timeText}>{seg.departure_time || ''}</Text>
                    </View>
                    {seg.stations && seg.stations.length > 2 && (
                      <View style={styles.stationCountRow}>
                        <Text style={styles.stationCountText}>
                          ⬇ {seg.stations.length - 2} stations · {seg.travel_time_minutes} min
                        </Text>
                      </View>
                    )}
                    <View style={styles.stationRow}>
                      <View style={[styles.dot, {
                        backgroundColor: colors.neutral[0], borderColor: lineColor, borderWidth: 2,
                      }]} />
                      <Text style={styles.stationName}>{seg.to_station}</Text>
                      <Text style={styles.timeText}>{seg.arrival_time || ''}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Next Trains */}
            {result.next_trains && result.next_trains.length > 0 && (
              <View style={styles.nextTrainsSection}>
                <Text style={styles.nextTrainsTitle}>Next Departures</Text>
                {result.next_trains.slice(0, 3).map((train, i) => (
                  <View key={i} style={styles.trainRow}>
                    <Text style={styles.trainTime}>{train.arrival_time}</Text>
                    <Text style={styles.trainDest}>→ {train.destination}</Text>
                    <View style={[
                      styles.trainStatus,
                      { backgroundColor: train.status === 'Arriving' ? colors.green[100] : colors.neutral[100] },
                    ]}>
                      <Text style={[
                        styles.trainStatusText,
                        { color: train.status === 'Arriving' ? colors.green[600] : colors.text.secondary },
                      ]}>
                        {train.status === 'Arriving' ? 'Arriving' : `${train.minutes_away} min`}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.xl, marginBottom: spacing.lg, ...shadows.md,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.purple[600], marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: colors.text.secondary, marginBottom: spacing.lg },
  swapBtn: {
    position: 'absolute', right: 16, top: 25, width: 40, height: 40,
    borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.neutral[200], alignItems: 'center',
    justifyContent: 'center', ...shadows.sm,
  },
  swapIcon: { fontSize: 20, color: colors.purple[600], fontWeight: '600' },
  btnPrimary: {
    backgroundColor: colors.purple[600], borderRadius: 24,
    paddingVertical: 14, alignItems: 'center', marginTop: spacing.xxl,
  },
  btnText: { color: colors.neutral[0], fontSize: 16, fontWeight: '700' },
  errorCard: {
    backgroundColor: '#FFF3F0', padding: spacing.lg, borderRadius: borderRadius.sm,
    marginBottom: spacing.lg,
  },
  errorText: { fontSize: 13, color: colors.status.error },
  resultHeader: {
    backgroundColor: colors.purple[100], padding: spacing.lg,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  resultTitle: { fontSize: 15, fontWeight: '700', color: colors.purple[600] },
  fastestBadge: {
    backgroundColor: colors.status.success, paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: 12,
  },
  fastestText: { color: colors.neutral[0], fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  statBox: { flex: 1, padding: spacing.lg, alignItems: 'center' },
  statLabel: { fontSize: 11, color: colors.text.muted, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  segmentContainer: { borderLeftWidth: 4, paddingLeft: spacing.lg, marginBottom: spacing.lg, marginLeft: 8 },
  lineTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  stationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  stationName: { fontSize: 15, fontWeight: '500', color: colors.text.primary, flex: 1 },
  timeText: { fontSize: 12, color: colors.text.muted },
  stationCountRow: { paddingLeft: 22, marginBottom: 12 },
  stationCountText: { fontSize: 12, color: colors.text.muted },
  nextTrainsSection: {
    borderTopWidth: 1, borderTopColor: colors.neutral[100],
    padding: spacing.lg,
  },
  nextTrainsTitle: { fontSize: 13, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm },
  trainRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
  },
  trainTime: { fontSize: 13, fontWeight: '600', color: colors.text.primary, width: 80 },
  trainDest: { fontSize: 12, color: colors.text.secondary, flex: 1 },
  trainStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  trainStatusText: { fontSize: 11, fontWeight: '600' },
});
