/**
 * QR Ticket Purchase Screen — Station selection & ticket purchase.
 * Closely matches the Namma Metro ticket purchase experience.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Header } from '../../shared/components/Header';
import { StationSelector } from '../../shared/components/StationSelector';
import { useJourneyStore } from '../../data/store/journeyStore';
import { colors, spacing, borderRadius, shadows } from '../../navigation/theme';
import type { RootStackParamList } from '../../shared/types';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'QRTickets'>;
type RouteP = RouteProp<RootStackParamList, 'QRTickets'>;

export default function QRPurchaseScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteP>();
  const { purchaseTicket, purchasing } = useJourneyStore();

  const [source, setSource] = useState(route.params?.from || '');
  const [dest, setDest] = useState(route.params?.to || '');
  const [passengers, setPassengers] = useState(1);

  const swapStations = () => {
    const tmp = source;
    setSource(dest);
    setDest(tmp);
  };

  const handlePurchase = async () => {
    if (!source || !dest) return;
    try {
      const data = await purchaseTicket(source, dest, passengers);
      navigation.navigate('TicketDetails', {
        ticketData: data,
        journeyId: data.journey_id,
      });
    } catch (err) {
      console.error('Purchase failed:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Namma Metro QR Tickets" />

      <View style={styles.card}>
        <View style={styles.relative}>
          <StationSelector
            label="Select From Station"
            value={source}
            onChange={setSource}
            excludeId={dest}
          />
          <View style={styles.divider} />
          <StationSelector
            label="Select To Station"
            value={dest}
            onChange={setDest}
            excludeId={source}
          />

          <TouchableOpacity style={styles.swapBtn} onPress={swapStations}>
            <Text style={styles.swapIcon}>⇅</Text>
          </TouchableOpacity>
        </View>

        {/* Passenger Count */}
        <View style={styles.passengerRow}>
          <Text style={styles.passengerText}>Number of Passengers</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepperBtn, passengers <= 1 && styles.stepperBtnDisabled]}
              onPress={() => setPassengers(Math.max(1, passengers - 1))}
              disabled={passengers <= 1}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{passengers}</Text>
            <TouchableOpacity
              style={[styles.stepperBtn, passengers >= 6 && styles.stepperBtnDisabled]}
              onPress={() => setPassengers(Math.min(6, passengers + 1))}
              disabled={passengers >= 6}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.purchaseBtn, (!source || !dest || purchasing) && styles.purchaseBtnDisabled]}
          onPress={handlePurchase}
          disabled={!source || !dest || purchasing}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.neutral[0]} />
          ) : (
            <Text style={styles.purchaseBtnText}>PURCHASE</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface, margin: spacing.lg,
    borderRadius: borderRadius.lg, padding: spacing.xl, ...shadows.md,
  },
  relative: { position: 'relative' },
  divider: { height: spacing.lg },
  swapBtn: {
    position: 'absolute', right: 16, top: 40, width: 40, height: 40,
    borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.neutral[200], alignItems: 'center',
    justifyContent: 'center', ...shadows.sm, zIndex: 10,
  },
  swapIcon: { fontSize: 20, color: colors.purple[600], fontWeight: '600' },
  passengerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: spacing.xxl,
    marginBottom: spacing.xxxl,
  },
  passengerText: { fontSize: 15, color: colors.text.primary },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.purple[600], borderRadius: 20,
  },
  stepperBtn: { paddingHorizontal: 16, paddingVertical: 6 },
  stepperBtnDisabled: { opacity: 0.3 },
  stepperBtnText: { fontSize: 20, color: colors.purple[600], fontWeight: '600' },
  stepperValue: {
    fontSize: 16, fontWeight: '600', color: colors.text.primary,
    minWidth: 24, textAlign: 'center',
  },
  purchaseBtn: {
    backgroundColor: colors.purple[600], borderRadius: 24,
    paddingVertical: 14, alignItems: 'center', marginHorizontal: 20,
  },
  purchaseBtnDisabled: { opacity: 0.6 },
  purchaseBtnText: { color: colors.neutral[0], fontSize: 16, fontWeight: '700', letterSpacing: 1 },
});
