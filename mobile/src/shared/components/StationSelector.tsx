import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, FlatList, Modal, SafeAreaView,
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

  const filtered = useMemo(() => {
    return ALL_STATIONS
      .filter((s) => s.id !== excludeId)
      .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [search, excludeId]);

  const handleSelect = useCallback((station: Station) => {
    onChange(station.id);
    setModalVisible(false);
    setSearch('');
  }, [onChange]);

  const getLineColor = (station: Station): string => {
    if (station.line === 'green') return colors.green[500];
    if (station.line === 'yellow') return colors.status.warning;
    if (station.line === 'both' || station.line === 'multiple') return colors.purple[600];
    return colors.purple[600];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity 
        style={styles.triggerButton} 
        onPress={() => {
          setSearch('');
          setModalVisible(true);
        }}
      >
        <Text style={[styles.triggerText, !selectedStation && styles.placeholderText]}>
          {selectedStation ? selectedStation.name : 'Select a station...'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{label}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={`Enter ${label}...`}
              placeholderTextColor={colors.text.muted}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>

          <Text style={styles.sectionHeader}>AVAILABLE STATIONS</Text>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={() => (
              <Text style={styles.noResults}>No stations found.</Text>
            )}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.stationItem}
                onPress={() => handleSelect(item)}
              >
                <View style={[styles.stationDot, { backgroundColor: getLineColor(item) }]} />
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
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  triggerButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    justifyContent: 'center',
  },
  triggerText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  placeholderText: {
    color: colors.text.muted,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  backButtonText: {
    fontSize: 24,
    color: colors.purple[600],
    fontWeight: '500',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    fontSize: 16,
    color: colors.text.primary,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  noResults: {
    padding: spacing.md,
    textAlign: 'center',
    color: colors.text.muted,
    fontSize: 16,
  },
  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  stationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  stationText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
  interchangeBadge: {
    backgroundColor: colors.purple[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.purple[200],
  },
  interchangeText: {
    fontSize: 11,
    color: colors.purple[700],
    fontWeight: '600',
  },
});
