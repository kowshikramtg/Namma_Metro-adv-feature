/**
 * Home Screen — Inspired by Namma Metro app layout.
 * Purple header, travel grid, recent trips, journey planner shortcut.
 */

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Dimensions, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, shadows, borderRadius } from '../../navigation/theme';
import { useJourneyStore } from '../../data/store/journeyStore';
import type { RootStackParamList } from '../../shared/types';

const { width } = Dimensions.get('window');
type NavProp = NativeStackNavigationProp<RootStackParamList>;

const recentTrips = [
  { from: 'Magadi Road', to: 'Kengeri Bus Terminal', fromId: 'magadi_road', toId: 'kengeri_bus_terminal' },
  { from: 'Kengeri Bus Terminal', to: 'Mahakavi Kuvempu Road', fromId: 'kengeri_bus_terminal', toId: 'mahakavi_kuvempu_road' },
  { from: 'Majestic', to: 'Indiranagar', fromId: 'nadaprabhu_kempegowda_majestic', toId: 'indiranagar' },
];

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { activeTicket, activeJourneyId } = useJourneyStore();

  const travelItems = [
    { icon: '🎫', label: 'Top Up', route: null },
    { icon: '🎟️', label: 'QR Tickets', route: 'QRTickets' as const },
    { icon: '📱', label: 'QR Pass', route: null },
    { icon: '🕐', label: 'Time Table', route: null },
    { icon: '🗺️', label: 'Map', route: 'MetroMap' as const },
    { icon: '💰', label: 'Fare Info', route: null },
    { icon: '🎧', label: 'Support', route: null },
  ];

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.purple[600]} barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Purple Header */}
        <View style={styles.headerBackground}>
          <SafeAreaView>
            <View style={styles.userInfo}>
              <View style={styles.avatarRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>K</Text>
                </View>
                <Text style={styles.userName}>Kowshik T G</Text>
              </View>
              <View style={styles.headerIcons}>
                <Text style={styles.headerIcon}>🌐</Text>
                <Text style={[styles.headerIcon, { fontFamily: 'serif' }]}>ಕ</Text>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* Active Journey Banner */}
        {activeTicket && activeJourneyId && (
          <TouchableOpacity
            style={styles.activeJourneyBanner}
            onPress={() => navigation.navigate('TicketDetails', {
              ticketData: activeTicket,
              journeyId: activeJourneyId,
            })}
            activeOpacity={0.9}
          >
            <View style={styles.activeJourneyIconWrap}>
              <Text style={styles.activeJourneyIcon}>🚆</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeJourneyTitle}>Active Journey</Text>
              <Text style={styles.activeJourneyText}>
                {activeTicket.source} → {activeTicket.destination}
              </Text>
            </View>
            <Text style={styles.activeJourneyArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Travel Grid Section */}
        <View style={styles.travelSection}>
          <Text style={styles.sectionTitle}>Travel</Text>
          <View style={styles.travelGrid}>
            {travelItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.travelItem}
                onPress={() => item.route && navigation.navigate(item.route)}
                activeOpacity={item.route ? 0.7 : 1}
              >
                <View style={styles.iconCircle}>
                  <Text style={styles.iconText}>{item.icon}</Text>
                </View>
                <Text style={styles.itemLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Travel */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Travel</Text>
          {recentTrips.map((trip, i) => (
            <View key={i} style={styles.recentCard}>
              <Text style={styles.recentEmoji}>🚇</Text>
              <View style={styles.recentInfo}>
                <View style={styles.recentRoute}>
                  <View style={styles.dot} />
                  <Text style={styles.recentText}>{trip.from}</Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.recentRoute}>
                  <View style={styles.dot} />
                  <Text style={styles.recentText}>{trip.to}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.buyButton}
                onPress={() => navigation.navigate('QRTickets', { from: trip.fromId, to: trip.toId })}
              >
                <Text style={styles.buyButtonText}>Buy Again</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Smart Journey Planner */}
        <TouchableOpacity
          style={styles.plannerCard}
          onPress={() => navigation.navigate('RoutePlanner')}
        >
          <View style={styles.plannerIconContainer}>
            <Text style={styles.plannerIcon}>🧭</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.plannerTitle}>Smart Journey Planner</Text>
            <Text style={styles.plannerSub}>Plan routes with schedule-computed timings</Text>
          </View>
          <Text style={styles.plannerArrow}>›</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1 },
  headerBackground: { backgroundColor: colors.purple[600], paddingBottom: 40 },
  userInfo: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.purple[500], alignItems: 'center',
    justifyContent: 'center', borderWidth: 2, borderColor: colors.neutral[0],
  },
  avatarText: { color: colors.neutral[0], fontSize: 16, fontWeight: '700' },
  userName: { color: colors.neutral[0], fontSize: 16, fontWeight: '600', marginLeft: 12 },
  headerIcons: { flexDirection: 'row', gap: 16 },
  headerIcon: { color: colors.neutral[0], fontSize: 18 },
  activeJourneyBanner: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: -20,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.md,
    borderWidth: 1,
    borderColor: `${colors.purple[600]}30`,
    zIndex: 10,
  },
  activeJourneyIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: `${colors.purple[600]}15`,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  activeJourneyIcon: { fontSize: 20 },
  activeJourneyTitle: { fontSize: 12, fontWeight: '700', color: colors.purple[600], marginBottom: 2 },
  activeJourneyText: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  activeJourneyArrow: { fontSize: 24, color: colors.purple[600], marginLeft: 8 },
  travelSection: {
    backgroundColor: colors.background, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, marginTop: -24,
    paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: colors.text.primary,
    marginBottom: spacing.lg, textTransform: 'uppercase',
  },
  travelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  travelItem: { width: (width - 32 - 48) / 4, alignItems: 'center' },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.surface, alignItems: 'center',
    justifyContent: 'center', ...shadows.sm,
    borderWidth: 1, borderColor: `${colors.purple[600]}20`,
  },
  iconText: { fontSize: 24 },
  itemLabel: {
    fontSize: 11, color: colors.text.primary, marginTop: 8,
    textAlign: 'center', fontWeight: '500',
  },
  recentSection: { paddingHorizontal: spacing.lg, paddingVertical: 8 },
  recentCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, marginBottom: spacing.md,
    flexDirection: 'row', alignItems: 'center', ...shadows.sm,
    borderWidth: 1, borderColor: colors.neutral[150],
  },
  recentEmoji: { fontSize: 24, marginRight: spacing.lg },
  recentInfo: { flex: 1 },
  recentRoute: { flexDirection: 'row', alignItems: 'center' },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.purple[600], marginRight: 8,
  },
  routeLine: {
    width: 2, height: 12, backgroundColor: colors.neutral[200],
    marginLeft: 2, marginVertical: 4,
  },
  recentText: { fontSize: 13, fontWeight: '500', color: colors.text.primary },
  buyButton: {
    backgroundColor: `${colors.purple[600]}15`, paddingVertical: 6,
    paddingHorizontal: 12, borderRadius: 16, borderWidth: 1,
    borderColor: `${colors.purple[600]}30`,
  },
  buyButtonText: { color: colors.purple[600], fontSize: 12, fontWeight: '600' },
  plannerCard: {
    marginHorizontal: spacing.lg, marginTop: 8,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: `${colors.purple[600]}30`, ...shadows.md,
  },
  plannerIconContainer: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: `${colors.purple[600]}10`, alignItems: 'center',
    justifyContent: 'center', marginRight: spacing.lg,
  },
  plannerIcon: { fontSize: 22 },
  plannerTitle: { fontSize: 15, fontWeight: '700', color: colors.purple[600] },
  plannerSub: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  plannerArrow: { fontSize: 24, color: colors.purple[600], marginLeft: 8 },
});
