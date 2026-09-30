/**
 * Journey Visualization Screen — Shows active journey on the metro map.
 * Reuses MetroNetworkSVG with route highlighting and train position.
 * Accessible via swipe/navigate from Journey Timeline.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, ScrollView,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Header } from '../../shared/components/Header';
import { MetroNetworkSVG } from '../metro-map/components/MetroNetworkSVG';
import { useJourneyStore } from '../../data/store/journeyStore';
import { getJourney } from '../../data/api/metroApi';
import { colors, spacing, borderRadius, shadows } from '../../navigation/theme';
import type { RootStackParamList, RouteSegment, LiveStatus } from '../../shared/types';
import { getNodeById } from '../metro-map/data/networkLayout';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type RouteP = RouteProp<RootStackParamList, 'JourneyVisualization'>;

export default function JourneyVisualizationScreen() {
  const route = useRoute<RouteP>();
  const { journeyId, ticketData } = route.params;
  const { liveStatus: activeStatus, segments: storeSegments } = useJourneyStore();
  
  // Strict Single Source of Truth from Store
  const activeSegments = storeSegments.length > 0 ? storeSegments : (ticketData.route?.segments || []);

  // Build highlighted route from all segment station IDs
  const highlightedRoute = activeSegments.flatMap((s) => s.station_ids || []);

  // Current station from live status
  const currentStationId = (() => {
    if (!activeStatus) return undefined;
    const seg = activeSegments[activeStatus.current_segment];
    if (!seg?.station_ids) return undefined;
    const idx = Math.floor(activeStatus.segment_progress * (seg.station_ids.length - 1));
    return seg.station_ids[Math.min(idx, seg.station_ids.length - 1)];
  })();

  const activeTrainCoords = (() => {
    if (!activeStatus) return undefined;
    const seg = activeSegments[activeStatus.current_segment];
    if (!seg?.station_ids || seg.station_ids.length < 2) return undefined;
    
    const totalEdges = seg.station_ids.length - 1;
    const rawIndex = activeStatus.segment_progress * totalEdges;
    const idx = Math.min(Math.floor(rawIndex), totalEdges - 1);
    const remainder = rawIndex - idx;
    
    const nodeA = getNodeById(seg.station_ids[idx]);
    const nodeB = getNodeById(seg.station_ids[idx + 1]);
    
    if (nodeA && nodeB) {
      return {
        x: nodeA.x + (nodeB.x - nodeA.x) * remainder,
        y: nodeA.y + (nodeB.y - nodeA.y) * remainder,
      };
    }
    return undefined;
  })();

  const statusText = (() => {
    if (!activeStatus) return 'Loading...';
    switch (activeStatus.status) {
      case 'boarding': return 'Boarding';
      case 'in_progress': return `${activeStatus.current_station}`;
      case 'approaching_interchange': return 'Transfer';
      case 'approaching_destination': return 'Arriving soon';
      case 'completed': return 'Arrived';
      default: return 'Tracking...';
    }
  })();

  return (
    <View style={styles.container}>
      <Header title="Journey Map" />

      <ScrollView
        style={styles.mapScroll}
        contentContainerStyle={styles.mapContent}
        maximumZoomScale={4}
        minimumZoomScale={0.5}
        bouncesZoom={true}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        pinchGestureEnabled={true}
        centerContent={true}
      >
        <MetroNetworkSVG
          width={SCREEN_W}
          height={SCREEN_H - 200}
          highlightedRoute={highlightedRoute}
          activeStationId={currentStationId}
          activeTrainCoords={activeTrainCoords}
        />
      </ScrollView>

      {/* Journey Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>{statusText}</Text>
          {activeStatus && activeStatus.status !== 'completed' && (
            <Text style={styles.etaText}>
              {Math.ceil(activeStatus.remaining_minutes)} min left
            </Text>
          )}
        </View>

        {/* Progress */}
        {activeStatus && (
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${(activeStatus.progress) * 100}%` }]}
            />
          </View>
        )}

        <View style={styles.routeRow}>
          <Text style={styles.routeText}>
            {ticketData.source} → {ticketData.destination}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapScroll: { flex: 1 },
  mapContent: { alignItems: 'center' },
  statusBar: {
    backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg, padding: spacing.lg, ...shadows.lg,
  },
  statusRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  statusText: { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  etaText: { fontSize: 14, fontWeight: '700', color: colors.purple[600] },
  progressBar: {
    height: 4, backgroundColor: colors.neutral[200], borderRadius: 2,
    marginVertical: spacing.sm, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.purple[600], borderRadius: 2 },
  routeRow: { marginTop: 4 },
  routeText: { fontSize: 12, color: colors.text.secondary },
});
