/**
 * Journey Timeline Screen — Full journey details.
 * Opened via "View Journey →" from the Journey Companion.
 * Shows complete timeline with stations, times, and interchanges.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Header } from '../../shared/components/Header';
import { useJourneyStore } from '../../data/store/journeyStore';
import { getJourney } from '../../data/api/metroApi';
import { colors, spacing, borderRadius, shadows } from '../../navigation/theme';
import type { RootStackParamList, RouteSegment, LiveStatus } from '../../shared/types';

type RouteP = RouteProp<RootStackParamList, 'JourneyTimeline'>;

export default function JourneyTimelineScreen() {
  const route = useRoute<RouteP>();
  const { journeyId, ticketData } = route.params;
  const { liveStatus, segments: storeSegments } = useJourneyStore();

  const [segments, setSegments] = useState<RouteSegment[]>(
    ticketData.route?.segments || []
  );
  const [status, setStatus] = useState<LiveStatus | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getJourney(journeyId);
        setSegments(data.journey.segments);
        setStatus(data.live_status);
      } catch {
        setSegments(ticketData.route?.segments || []);
      }
    };
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, [journeyId]);

  const activeStatus = liveStatus || status;
  const activeSegments = storeSegments.length > 0 ? storeSegments : segments;

  const totalTime = ticketData.route?.total_time_minutes ?? 0;
  const interchanges = ticketData.route?.interchange_count ?? 0;
  const stationCount = ticketData.route?.stations_count ?? 0;

  return (
    <View style={styles.container}>
      <Header title="Journey Timeline" />
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Summary Header */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalTime}</Text>
              <Text style={styles.summaryLabel}>min</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{stationCount}</Text>
              <Text style={styles.summaryLabel}>stations</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{interchanges}</Text>
              <Text style={styles.summaryLabel}>changes</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>₹{ticketData.fare}</Text>
              <Text style={styles.summaryLabel}>fare</Text>
            </View>
          </View>

          {/* Progress Bar */}
          {activeStatus && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(activeStatus.progress ?? 0) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {activeStatus.status === 'completed'
                  ? 'Journey Complete'
                  : `${Math.ceil(activeStatus.remaining_minutes ?? 0)} min remaining`
                }
              </Text>
            </View>
          )}
        </View>

        {/* Timeline Segments */}
        {activeSegments.map((seg, i) => {
          const lineColor = seg.line === 'green' ? colors.green[500] : colors.purple[600];
          const lineName = seg.line === 'green' ? 'Green Line' : 'Purple Line';
          const isActive = activeStatus ? i === activeStatus.current_segment : false;
          const isPassed = activeStatus ? i < activeStatus.current_segment : false;
          const stationList = seg.stations || [];

          return (
            <React.Fragment key={i}>
              {/* Line Badge */}
              <View style={[styles.segmentCard, { borderLeftColor: lineColor }]}>
                <View style={styles.segmentHeader}>
                  <View style={[styles.lineBadge, { backgroundColor: lineColor }]}>
                    <Text style={styles.lineBadgeText}>{lineName}</Text>
                  </View>
                  {isActive && (
                    <View style={styles.activeBadge}>
                      <View style={styles.activeDot} />
                      <Text style={styles.activeText}>Live</Text>
                    </View>
                  )}
                  {isPassed && (
                    <View style={[styles.activeBadge, { backgroundColor: colors.green[100] }]}>
                      <Text style={[styles.activeText, { color: colors.green[600] }]}>✓ Done</Text>
                    </View>
                  )}
                </View>

                {/* Departure Station */}
                <View style={styles.timelineStation}>
                  <View style={[styles.timelineDot, { backgroundColor: lineColor }]} />
                  <View style={styles.timelineStationInfo}>
                    <Text style={styles.timelineStationName}>{seg.from_station}</Text>
                    <Text style={styles.timelineLabel}>Depart</Text>
                  </View>
                  <Text style={styles.timelineTime}>{seg.departure_time || '--:--'}</Text>
                </View>

                {/* Intermediate Stations */}
                {stationList.length > 2 && (
                  <View style={styles.intermediateContainer}>
                    <View style={[styles.intermediateBar, { backgroundColor: `${lineColor}30` }]} />
                    <Text style={styles.intermediateText}>
                      ⬇ {stationList.length - 2} stations · {seg.travel_time_minutes} min
                    </Text>
                  </View>
                )}

                {/* Current position indicator */}
                {isActive && activeStatus?.current_station && (
                  <View style={styles.currentPositionRow}>
                    <View style={[styles.currentDot, { backgroundColor: lineColor, borderColor: `${lineColor}40` }]} />
                    <Text style={[styles.currentStation, { color: lineColor }]}>
                      📍 {activeStatus.current_station}
                    </Text>
                  </View>
                )}

                {/* Arrival Station */}
                <View style={styles.timelineStation}>
                  <View style={[styles.timelineDot, {
                    backgroundColor: colors.neutral[0], borderColor: lineColor, borderWidth: 2,
                  }]} />
                  <View style={styles.timelineStationInfo}>
                    <Text style={styles.timelineStationName}>{seg.to_station}</Text>
                    <Text style={styles.timelineLabel}>Arrive</Text>
                  </View>
                  <Text style={styles.timelineTime}>{seg.arrival_time || '--:--'}</Text>
                </View>
              </View>

              {/* Interchange Connector */}
              {i < activeSegments.length - 1 && (
                <View style={styles.interchangeConnector}>
                  <View style={styles.interchangeIconWrap}>
                    <Text style={styles.interchangeIcon}>🔄</Text>
                  </View>
                  <View>
                    <Text style={styles.interchangeTitle}>Interchange</Text>
                    <Text style={styles.interchangeSub}>2 min walk to platform</Text>
                  </View>
                </View>
              )}
            </React.Fragment>
          );
        })}

        {/* Destination */}
        <View style={styles.destinationCard}>
          <Text style={styles.destinationIcon}>🎯</Text>
          <View>
            <Text style={styles.destinationTitle}>{ticketData.destination}</Text>
            <Text style={styles.destinationSub}>
              Estimated arrival: {activeSegments.length > 0
                ? activeSegments[activeSegments.length - 1].arrival_time || '--:--'
                : '--:--'
              }
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: 40 },

  // ── Summary ──
  summaryCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.lg, ...shadows.md,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '700', color: colors.purple[600] },
  summaryLabel: { fontSize: 11, color: colors.text.muted, marginTop: 2 },
  summaryDivider: { width: 1, height: 30, backgroundColor: colors.neutral[200] },
  progressContainer: { marginTop: spacing.lg },
  progressBar: {
    height: 4, backgroundColor: colors.neutral[200], borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.purple[600], borderRadius: 2 },
  progressText: { fontSize: 12, color: colors.text.secondary, marginTop: 6, textAlign: 'center' },

  // ── Segments ──
  segmentCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, marginBottom: spacing.sm, ...shadows.sm,
    borderLeftWidth: 4,
  },
  segmentHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.md,
  },
  lineBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  lineBadgeText: { color: colors.neutral[0], fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F44336', marginRight: 4 },
  activeText: { fontSize: 11, fontWeight: '700', color: '#FF9800' },

  // ── Timeline Stations ──
  timelineStation: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm,
  },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  timelineStationInfo: { flex: 1 },
  timelineStationName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  timelineLabel: { fontSize: 11, color: colors.text.muted, marginTop: 1 },
  timelineTime: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },

  intermediateContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginLeft: 5, paddingLeft: 18, paddingVertical: spacing.sm,
  },
  intermediateBar: { width: 2, height: 24, marginRight: 12, borderRadius: 1 },
  intermediateText: { fontSize: 12, color: colors.text.muted },

  currentPositionRow: {
    flexDirection: 'row', alignItems: 'center', marginLeft: 5,
    paddingLeft: 12, paddingVertical: 6,
  },
  currentDot: {
    width: 10, height: 10, borderRadius: 5, marginRight: 10,
    borderWidth: 3,
  },
  currentStation: { fontSize: 13, fontWeight: '700' },

  // ── Interchange ──
  interchangeConnector: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  interchangeIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.purple[50], alignItems: 'center',
    justifyContent: 'center', marginRight: 12,
  },
  interchangeIcon: { fontSize: 18 },
  interchangeTitle: { fontSize: 13, fontWeight: '700', color: colors.text.primary },
  interchangeSub: { fontSize: 11, color: colors.text.secondary, marginTop: 1 },

  // ── Destination ──
  destinationCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.green[100], borderRadius: borderRadius.md,
    padding: spacing.lg, marginTop: spacing.sm,
  },
  destinationIcon: { fontSize: 28, marginRight: spacing.md },
  destinationTitle: { fontSize: 16, fontWeight: '700', color: colors.green[700] },
  destinationSub: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
});
