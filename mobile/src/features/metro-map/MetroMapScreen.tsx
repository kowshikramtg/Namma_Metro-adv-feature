/**
 * Metro Map Screen — Full network map with station interaction.
 * Uses react-native-gesture-handler for pinch-zoom and pan.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView,
} from 'react-native';
import { Header } from '../../shared/components/Header';
import { MetroNetworkSVG } from './components/MetroNetworkSVG';
import { colors, spacing, borderRadius, shadows } from '../../navigation/theme';
import type { StationNode } from './data/networkLayout';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MAP_H = SCREEN_H - 140; // header + info panel

export default function MetroMapScreen() {
  const [selectedStation, setSelectedStation] = useState<StationNode | null>(null);

  const handleStationPress = useCallback((station: StationNode) => {
    setSelectedStation(station);
  }, []);

  const lineLabel = (line: string) => {
    if (line === 'both') return 'Purple & Green Lines (Interchange)';
    return `${line.charAt(0).toUpperCase() + line.slice(1)} Line`;
  };

  const lineColor = (line: string) => {
    if (line === 'green') return colors.green[500];
    return colors.purple[600];
  };

  return (
    <View style={styles.container}>
      <Header title="Metro Network Map" />

      <ScrollView
        style={styles.mapScroll}
        contentContainerStyle={styles.mapContent}
        maximumZoomScale={3}
        minimumZoomScale={0.8}
        bouncesZoom
        showsVerticalScrollIndicator={false}
      >
        <MetroNetworkSVG
          width={SCREEN_W}
          height={MAP_H}
          onStationPress={handleStationPress}
        />
      </ScrollView>

      {/* Station Info Panel */}
      {selectedStation && (
        <View style={styles.infoPanel}>
          <View style={styles.infoPanelHeader}>
            <View style={[styles.lineIndicator, { backgroundColor: lineColor(selectedStation.line) }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stationName}>{selectedStation.name}</Text>
              <Text style={styles.lineText}>{lineLabel(selectedStation.line)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedStation(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedStation.line === 'both' && (
            <View style={styles.interchangeNote}>
              <Text style={styles.interchangeText}>
                🔄 Transfer between Purple and Green Lines
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapScroll: { flex: 1 },
  mapContent: { alignItems: 'center' },
  infoPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg, padding: spacing.lg, ...shadows.lg,
  },
  infoPanelHeader: { flexDirection: 'row', alignItems: 'center' },
  lineIndicator: {
    width: 4, height: 36, borderRadius: 2, marginRight: spacing.md,
  },
  stationName: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  lineText: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  closeBtn: { fontSize: 20, color: colors.text.muted, padding: 8 },
  interchangeNote: {
    marginTop: spacing.sm, backgroundColor: colors.purple[50],
    padding: spacing.sm, borderRadius: borderRadius.sm,
  },
  interchangeText: { fontSize: 12, color: colors.purple[600] },
});
