/**
 * Smart Journey Planner — Real timetable-based multi-option journey planner.
 * Shows ALL upcoming train options from source to destination.
 * Departed trains auto-expire. Times are real BMRCL schedule times.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Header } from '../../shared/components/Header';
import { StationSelector } from '../../shared/components/StationSelector';
import { planJourney } from '../../data/api/metroApi';
import { getUpcomingJourneys, type UpcomingJourney } from '../../data/stations/routing';
import { nowMinutes } from '../../data/stations/timetable';
import { colors, spacing, borderRadius, shadows } from '../../navigation/theme';

export default function RoutePlannerScreen() {
  const [source, setSource] = useState('');
  const [dest, setDest] = useState('');
  const [journeys, setJourneys] = useState<UpcomingJourney[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadJourneys = useCallback(async (src: string, dst: string, isRefresh = false) => {
    if (!src || !dst) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      // Offline fallback: try backend first if needed, here we just use the robust local engine
      let journeyList: UpcomingJourney[] = [];
      try {
        await planJourney(src, dst); // optional: test backend
        journeyList = getUpcomingJourneys(src, dst, 10);
      } catch {
        journeyList = getUpcomingJourneys(src, dst, 10);
      }

      // Keep only future trains
      const available = journeyList.filter(j => j.is_available);
      setJourneys(available);
      setLastRefresh(new Date());
    } catch (e) {
      setError('Could not load journey options. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleSearch = useCallback(() => {
    if (!source || !dest) return;
    setExpandedIdx(null);
    loadJourneys(source, dest);
  }, [source, dest, loadJourneys]);

  const handleRefresh = useCallback(() => {
    loadJourneys(source, dest, true);
  }, [source, dest, loadJourneys]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (journeys.length === 0) return;
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    
    refreshTimer.current = setInterval(() => {
      const now = nowMinutes();
      setJourneys(prev => {
        const updated = prev.filter(j => {
          const parts = j.departure_time.split(' ');
          if (parts.length < 2) return false;
          const [time, period] = [parts[0], parts[1].toUpperCase()];
          const [h, m] = time.split(':').map(Number);
          let h24 = h;
          if (period === 'PM' && h !== 12) h24 = h + 12;
          if (period === 'AM' && h === 12) h24 = 0;
          return (h24 * 60 + m) >= now;
        });
        return updated.map((j, i) => ({ ...j, index: i + 1 }));
      });
    }, 30_000);

    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [journeys.length]);

  const swapStations = () => {
    const tmp = source;
    setSource(dest);
    setDest(tmp);
    setJourneys([]);
  };

  const minutesUntil = (timeStr: string): number => {
    const parts = timeStr.split(' ');
    if (parts.length < 2) return 0;
    const [time, period] = [parts[0], parts[1].toUpperCase()];
    const [h, m] = time.split(':').map(Number);
    let h24 = h;
    if (period === 'PM' && h !== 12) h24 = h + 12;
    if (period === 'AM' && h === 12) h24 = 0;
    return (h24 * 60 + m) - nowMinutes();
  };

  const getStatusText = (journey: UpcomingJourney) => {
    const mins = minutesUntil(journey.departure_time);
    if (mins <= 0) return { text: 'Departing now', color: colors.status.error };
    if (mins <= 2) return { text: `${mins} min`, color: colors.status.error };
    if (mins <= 5) return { text: `${mins} min`, color: colors.status.warning };
    return { text: `${mins} min`, color: colors.status.success };
  };

  return (
    <View style={styles.container}>
      <Header title="Smart Journey Planner" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.purple[600]]}
            tintColor={colors.purple[600]}
          />
        }
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧭 Find Your Train</Text>
          <Text style={styles.cardSubtitle}>Real timetable · Auto-refreshes every 30s</Text>

          <View style={{ position: 'relative' }}>
            <StationSelector
              label="From Station"
              value={source}
              onChange={(v) => { setSource(v); setJourneys([]); }}
              excludeId={dest}
            />
            <View style={{ height: spacing.lg }} />
            <StationSelector
              label="To Station"
              value={dest}
              onChange={(v) => { setDest(v); setJourneys([]); }}
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
              <Text style={styles.btnText}>Show All Trains →</Text>
            )}
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {lastRefresh && journeys.length > 0 && (
          <View style={styles.refreshInfo}>
            <Text style={styles.refreshText}>
              🕒 Updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} · Pull to refresh
            </Text>
          </View>
        )}

        {journeys.length > 0 && (
          <View style={styles.journeyList}>
            <Text style={styles.listTitle}>
              {journeys.length} upcoming train{journeys.length !== 1 ? 's' : ''} found
            </Text>

            {journeys.map((journey, idx) => {
              const isExpanded = expandedIdx === idx;
              const status = getStatusText(journey);
              const firstSeg = journey.segments[0];
              const lastSeg = journey.segments[journey.segments.length - 1];
              const hasInterchange = journey.segments.length > 1;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.journeyCard, isExpanded && styles.journeyCardExpanded]}
                  onPress={() => setExpandedIdx(isExpanded ? null : idx)}
                  activeOpacity={0.85}
                >
                  <View style={styles.journeyHeader}>
                    <View style={styles.journeyIndexBadge}>
                      <Text style={styles.journeyIndexText}>{journey.index}</Text>
                    </View>

                    <View style={styles.journeyTimes}>
                      <View style={styles.timelineRow}>
                        <View style={styles.timelinePoint}>
                          <Text style={styles.timelineTime}>{firstSeg.departure_time}</Text>
                          <Text style={styles.timelineStation} numberOfLines={1}>
                            {firstSeg.from_station}
                          </Text>
                        </View>

                        {hasInterchange && (
                          <>
                            <Text style={styles.timelineArrow}>→</Text>
                            <View style={styles.timelinePoint}>
                              <Text style={styles.timelineTime}>{firstSeg.arrival_time}</Text>
                              <Text style={[styles.timelineStation, { color: colors.purple[500] }]} numberOfLines={1}>
                                Majestic 🔄
                              </Text>
                            </View>
                            <Text style={styles.timelineArrow}>→</Text>
                            <View style={styles.timelinePoint}>
                              <Text style={styles.timelineTime}>{journey.segments[1].departure_time}</Text>
                              <Text style={styles.timelineStation} numberOfLines={1}>
                                board ↗
                              </Text>
                            </View>
                          </>
                        )}

                        <Text style={styles.timelineArrow}>→</Text>
                        <View style={styles.timelinePoint}>
                          <Text style={[styles.timelineTime, { color: colors.green[600] }]}>
                            {lastSeg.arrival_time}
                          </Text>
                          <Text style={styles.timelineStation} numberOfLines={1}>
                            {lastSeg.to_station}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.statsRow}>
                        <Text style={styles.statChip}>⏱ {journey.total_time_minutes} min</Text>
                        <Text style={styles.statChip}>🚉 {journey.stations_count} stations</Text>
                        <Text style={styles.statChip}>₹{journey.fare_estimate}</Text>
                        {hasInterchange && (
                          <Text style={[styles.statChip, { color: colors.status.warning }]}>🔄 1 change</Text>
                        )}
                      </View>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
                      <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.expandedDetail}>
                      {journey.segments.map((seg, si) => {
                        const lc = seg.line === 'green' ? colors.green[500] : colors.purple[600];
                        return (
                          <View key={si}>
                            <View style={[styles.segDetail, { borderLeftColor: lc }]}>
                              <Text style={[styles.segLine, { color: lc }]}>
                                {seg.line.charAt(0).toUpperCase() + seg.line.slice(1)} Line
                              </Text>
                              <View style={styles.segRow}>
                                <View style={[styles.segDot, { backgroundColor: lc }]} />
                                <Text style={styles.segStation}>{seg.from_station}</Text>
                                <Text style={styles.segTime}>{seg.departure_time}</Text>
                              </View>
                              {seg.stations && seg.stations.length > 2 && (
                                <Text style={styles.segIntermediate}>
                                  ⬇ {seg.stations.length - 2} intermediate stations · {seg.travel_time_minutes} min
                                </Text>
                              )}
                              <View style={styles.segRow}>
                                <View style={[styles.segDot, { backgroundColor: colors.neutral[0], borderColor: lc, borderWidth: 2 }]} />
                                <Text style={styles.segStation}>{seg.to_station}</Text>
                                <Text style={styles.segTime}>{seg.arrival_time}</Text>
                              </View>
                            </View>

                            {si < journey.segments.length - 1 && (
                              <View style={styles.interchangeNote}>
                                <Text style={styles.interchangeNoteText}>
                                  🔄 Change trains at Majestic · Walk ~3 min to {journey.segments[si + 1].line} Line platform
                                </Text>
                                <Text style={styles.interchangeNoteText}>
                                  🕒 Next {journey.segments[si + 1].line} Line train: {journey.segments[si + 1].departure_time}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                  <Text style={styles.expandHint}>{isExpanded ? '▲ Less' : '▼ Details'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {journeys.length === 0 && !loading && !error && source && dest && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌙</Text>
            <Text style={styles.emptyTitle}>No trains available</Text>
            <Text style={styles.emptyText}>Metro services have ended. First trains at 05:00 AM.</Text>
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
  refreshInfo: { alignItems: 'center', marginBottom: spacing.sm },
  refreshText: { fontSize: 11, color: colors.text.muted },
  journeyList: { gap: spacing.sm },
  listTitle: {
    fontSize: 13, fontWeight: '700', color: colors.text.secondary,
    marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  journeyCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, ...shadows.sm,
    borderWidth: 1, borderColor: colors.neutral[100],
  },
  journeyCardExpanded: { borderColor: colors.purple[300], ...shadows.md },
  journeyHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  journeyIndexBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.purple[100], alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  journeyIndexText: { fontSize: 13, fontWeight: '700', color: colors.purple[700] },
  journeyTimes: { flex: 1 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 },
  timelinePoint: { alignItems: 'center', maxWidth: 70 },
  timelineTime: { fontSize: 13, fontWeight: '700', color: colors.text.primary },
  timelineStation: { fontSize: 10, color: colors.text.secondary, textAlign: 'center' },
  timelineArrow: { fontSize: 14, color: colors.text.muted, marginTop: 4, marginHorizontal: 2 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.sm },
  statChip: {
    fontSize: 11, color: colors.text.secondary,
    backgroundColor: colors.neutral[50], paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 8,
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700' },
  expandHint: { fontSize: 11, color: colors.text.muted, textAlign: 'center', marginTop: spacing.sm },
  expandedDetail: {
    marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.neutral[100], paddingTop: spacing.lg,
  },
  segDetail: { borderLeftWidth: 3, paddingLeft: spacing.md, marginBottom: spacing.md },
  segLine: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  segRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  segDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  segStation: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text.primary },
  segTime: { fontSize: 12, color: colors.text.secondary, fontWeight: '600' },
  segIntermediate: { fontSize: 12, color: colors.text.muted, paddingLeft: 20, marginBottom: 8 },
  interchangeNote: {
    backgroundColor: colors.purple[50], borderRadius: borderRadius.sm,
    padding: spacing.md, marginBottom: spacing.md,
  },
  interchangeNoteText: { fontSize: 12, color: colors.purple[700], marginBottom: 2 },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm },
  emptyText: { fontSize: 13, color: colors.text.secondary, textAlign: 'center' },
});
