/**
 * Station Selector component — modal-based station picker with search.
 * Reused across QR Purchase and Route Planner screens.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, SafeAreaView,
  FlatList, TextInput, StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../navigation/theme';
import { ALL_STATIONS } from '../../data/stations/stationData';
import type { Station } from '../types';

interface StationSelectorProps {
  label: string;
  value: string;
  onChange: (stationId: string) => void;
  excludeId?: string;
}

export const StationSelector: React.FC<StationSelectorProps> = ({
  label, value, onChange, excludeId,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const selectedStation = ALL_STATIONS.find((s) => s.id === value);

  const filtered = ALL_STATIONS
    .filter((s) => s.id !== excludeId)
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = useCallback((id: string) => {
    onChange(id);
    setSearch('');
    setModalVisible(false);
  }, [onChange]);

  const getLineColor = (station: Station): string => {
    if (station.line === 'green') return colors.green[500];
    if (station.line === 'both') return colors.purple[600];
    return colors.purple[600];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setModalVisible(true)}
      >
        <Text style={selectedStation ? styles.text : styles.placeholder}>
          {selectedStation ? selectedStation.name : 'Select Station'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => { setSearch(''); setModalVisible(false); }}
              style={styles.modalClose}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{label}</Text>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search stations..."
            value={search}
            onChangeText={setSearch}
            autoFocus
            placeholderTextColor={colors.text.muted}
          />

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.stationItem}
                onPress={() => handleSelect(item.id)}
              >
                <View
                  style={[styles.stationDot, { backgroundColor: getLineColor(item) }]}
                />
                <Text style={styles.stationText}>{item.name}</Text>
                {item.is_interchange && (
                  <View style={styles.interchangeBadge}>
                    <Text style={styles.interchangeText}>Interchange</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  label: { fontSize: 12, color: colors.text.secondary, marginBottom: 4 },
  input: { borderBottomWidth: 1, borderBottomColor: colors.neutral[200], paddingVertical: 8 },
  text: { fontSize: 16, color: colors.text.primary, fontWeight: '500' },
  placeholder: { fontSize: 16, color: colors.text.muted },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.neutral[200],
  },
  modalClose: { padding: 8, marginRight: 8 },
  closeIcon: { fontSize: 22, color: colors.purple[600] },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
  searchInput: {
    backgroundColor: colors.surface, margin: spacing.lg, padding: spacing.md,
    borderRadius: borderRadius.sm, fontSize: 16, borderWidth: 1,
    borderColor: colors.neutral[200], color: colors.text.primary,
  },
  stationItem: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.lg,
    backgroundColor: colors.surface, borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  stationDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  stationText: { fontSize: 15, color: colors.text.primary, flex: 1 },
  interchangeBadge: {
    backgroundColor: colors.purple[100], paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: 12,
  },
  interchangeText: { fontSize: 10, color: colors.purple[600], fontWeight: '600' },
});
