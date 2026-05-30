/**
 * Ticket Details Screen — The flagship Journey Companion experience.
 *
 * Layout priority:
 * 1. Trip Details (source → destination) — matches real Namma Metro
 * 2. QR Code with green border — preserved as-is
 * 3. Payment Details
 * 4. Journey Companion card — dynamically updating, compact
 *
 * The Journey Companion shows ONLY the most relevant information
 * at any given moment. Never a scrolling list — just the current state.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { Header } from '../../shared/components/Header';
import { useJourneyStore } from '../../data/store/journeyStore';
import { colors, spacing, borderRadius, shadows } from '../../navigation/theme';
import type { RootStackParamList, LiveStatus, JourneyAlert, RouteSegment } from '../../shared/types';
import { getJourney } from '../../data/api/metroApi';

type RouteP = RouteProp<RootStackParamList, 'TicketDetails'>;
type NavProp = NativeStackNavigationProp<RootStackParamList, 'TicketDetails'>;

const { width } = Dimensions.get('window');

// ── Journey Companion Card ──
// This is the core value-add. Shows only what matters RIGHT NOW.

interface CompanionProps {
  segments: RouteSegment[];
  liveStatus: LiveStatus | null;
  alerts: JourneyAlert[];
  onViewJourney: () => void;
}

const JourneyCompanionCard: React.FC<CompanionProps> = ({
  segments, liveStatus, alerts, onViewJourney,
}) => {
  if (!segments || segments.length === 0) return null;

  const currentSeg = liveStatus?.current_segment ?? 0;
  const status = liveStatus?.status ?? 'boarding';
  const segment = segments[currentSeg] || segments[0];
  const lineColor = segment.line === 'green' ? colors.green[500] : colors.purple[600];
  const lineName = segment.line === 'green' ? 'Green Line' : 'Purple Line';

  // Determine what to show based on journey status
  const getStatusDisplay = () => {
    switch (status) {
      case 'boarding':
        return { text: 'Board Now', color: colors.purple[600], icon: '🚇' };
      case 'in_progress':
        return { text: 'In Transit', color: colors.status.info, icon: '🚂' };
      case 'approaching_interchange':
        return { text: 'Interchange Ahead', color: colors.status.warning, icon: '🔄' };
      case 'approaching_destination':
        return { text: 'Arriving Soon', color: colors.status.success, icon: '📍' };
      case 'completed':
        return { text: 'Journey Complete', color: colors.status.success, icon: '✅' };
      default:
        return { text: 'On Time', color: colors.status.success, icon: '●' };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Get the most relevant alert
  const primaryAlert = alerts.length > 0 ? alerts[0] : null;

  // Compute minutes until arrival
  const remainingMin = liveStatus?.remaining_minutes ?? segment.travel_time_minutes ?? 0;
  const nextTrainInfo = segment.departure_time || '--:--';

  return (
    <View style={[styles.companionCard, { borderTopColor: lineColor }]}>
      {/* Header */}
      <View style={styles.companionHeader}>
        <View style={styles.companionLive}>
          <View style={[styles.liveDot, { backgroundColor: status === 'completed' ? colors.status.success : '#F44336' }]} />
          <Text style={styles.companionTitle}>Journey Companion</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusDisplay.color}15` }]}>
          <Text style={[styles.statusText, { color: statusDisplay.color }]}>
            {statusDisplay.icon} {statusDisplay.text}
          </Text>
        </View>
      </View>

      {/* Primary Info - What matters NOW */}
      {status !== 'completed' ? (
        <View style={styles.companionBody}>
          {/* Next Train / Current Position */}
          <View style={styles.infoRow}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>
                {status === 'boarding' ? 'Next Train' : 'Current'}
              </Text>
              <Text style={[styles.infoValue, { color: lineColor }]}>{lineName}</Text>
              {status === 'boarding' && (
                <Text style={styles.infoSub}>{nextTrainInfo}</Text>
              )}
              {status !== 'boarding' && liveStatus?.current_station && (
                <Text style={styles.infoSub}>{liveStatus.current_station}</Text>
              )}
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>
                {status === 'boarding' ? 'Board At' : 'Reach'}
              </Text>
              <Text style={styles.infoValue}>
                {status === 'boarding' ? segment.from_station : segment.to_station}
              </Text>
              <Text style={styles.infoSub}>{segment.arrival_time || '--:--'}</Text>
            </View>
          </View>

          {/* Interchange info (only if applicable) */}
          {segments.length > 1 && currentSeg < segments.length - 1 && (
            <View style={styles.interchangeRow}>
              <Text style={styles.interchangeIcon}>🔄</Text>
              <View>
                <Text style={styles.interchangeText}>
                  Interchange: {segments[currentSeg + 1].line === 'green' ? 'Green Line' : 'Purple Line'}
                </Text>
                <Text style={styles.interchangeSub}>at Majestic · 2 min walk</Text>
              </View>
            </View>
          )}

          {/* ETA */}
          <View style={styles.etaRow}>
            <Text style={styles.etaLabel}>Destination ETA</Text>
            <Text style={styles.etaValue}>
              {Math.ceil(remainingMin)} min
            </Text>
          </View>

          {/* Alert banner */}
          {primaryAlert && (
            <View style={[styles.alertBanner, { backgroundColor: `${primaryAlert.color}10`, borderLeftColor: primaryAlert.color }]}>
              <Text style={styles.alertIcon}>{primaryAlert.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertMessage, { color: primaryAlert.color }]}>
                  {primaryAlert.message}
                </Text>
                {primaryAlert.detail ? (
                  <Text style={styles.alertDetail}>{primaryAlert.detail}</Text>
                ) : null}
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.completedBody}>
          <Text style={styles.completedIcon}>🎯</Text>
          <Text style={styles.completedText}>You have reached your destination!</Text>
          <Text style={styles.completedSub}>Thank you for traveling with Namma Metro.</Text>
        </View>
      )}

      {/* View Journey Button */}
      <TouchableOpacity style={styles.viewJourneyBtn} onPress={onViewJourney}>
        <Text style={styles.viewJourneyText}>View Journey →</Text>
      </TouchableOpacity>
    </View>
  );
};

// ── Main Ticket Details Screen ──

export default function TicketDetailsScreen() {
  const route = useRoute<RouteP>();
  const navigation = useNavigation<NavProp>();
  const { ticketData, journeyId } = route.params;

  const {
    startJourneyTracking, stopJourneyTracking,
    liveStatus, alerts, segments: storeSegments,
  } = useJourneyStore();

  const [journeySegments, setJourneySegments] = useState<RouteSegment[]>(
    ticketData.route?.segments || []
  );
  const [localStatus, setLocalStatus] = useState<LiveStatus | null>(null);
  const [localAlerts, setLocalAlerts] = useState<JourneyAlert[]>([]);

  // Start WebSocket tracking and also poll as fallback
  useEffect(() => {
    startJourneyTracking(journeyId);

    // Also fetch via REST for initial data
    const fetchJourney = async () => {
      try {
        const data = await getJourney(journeyId);
        setJourneySegments(data.journey.segments);
        setLocalStatus(data.live_status);
        setLocalAlerts(data.alerts);
      } catch {
        // Backend unavailable — use ticket data
        setJourneySegments(ticketData.route?.segments || []);
      }
    };
    fetchJourney();

    // Poll every 10 seconds as fallback for when WebSocket isn't connected
    const interval = setInterval(fetchJourney, 10000);

    return () => {
      clearInterval(interval);
      stopJourneyTracking();
    };
  }, [journeyId]);

  // Prefer WebSocket data over REST data
  const activeStatus = liveStatus || localStatus;
  const activeAlerts = alerts.length > 0 ? alerts : localAlerts;
  const activeSegments = storeSegments.length > 0 ? storeSegments : journeySegments;

  const handleViewJourney = useCallback(() => {
    navigation.navigate('JourneyTimeline', { journeyId, ticketData });
  }, [navigation, journeyId, ticketData]);

  return (
    <View style={styles.container}>
      <Header title="Ticket Details" />
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Ticket Card — matches real Namma Metro */}
        <View style={styles.ticketCard}>
          <Text style={styles.ticketTitle}>Trip Details</Text>

          {/* Route: source → destination */}
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: colors.green[500] }]} />
            <Text style={styles.stationText}>{ticketData.source}</Text>
          </View>
          <View style={styles.routeConnector} />
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: colors.green[500] }]} />
            <Text style={styles.stationText}>{ticketData.destination}</Text>
          </View>

          {/* Passenger count */}
          <View style={styles.passengerInfo}>
            <Text style={styles.passengerIcon}>👥</Text>
            <Text style={styles.passengerCount}>{ticketData.passengers}</Text>
          </View>

          {/* QR Code — primary element, green border matching real ticket */}
          <View style={styles.qrContainer}>
            <View style={styles.qrWrapper}>
              <QRCode
                value={ticketData.ticket_id || 'DEMO-TICKET'}
                size={200}
                backgroundColor={colors.neutral[0]}
              />
            </View>
            <Text style={styles.ticketId}>{ticketData.ticket_id}</Text>
          </View>

          {/* Payment Details */}
          <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>Payment Details</Text>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Mode :</Text>
              <Text style={styles.paymentValue}>{ticketData.payment_mode}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Fare :</Text>
              <Text style={styles.paymentValue}>₹{ticketData.fare}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Passengers :</Text>
              <Text style={styles.paymentValue}>{ticketData.passengers}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Transaction Time :</Text>
              <Text style={styles.paymentValue}>{ticketData.transaction_time}</Text>
            </View>
          </View>
        </View>

        {/* Journey Companion — natural extension below the ticket */}
        <JourneyCompanionCard
          segments={activeSegments}
          liveStatus={activeStatus}
          alerts={activeAlerts}
          onViewJourney={handleViewJourney}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 40 },

  // ── Ticket Card ──
  ticketCard: {
    backgroundColor: colors.surface, margin: spacing.lg,
    borderRadius: borderRadius.lg, padding: spacing.xl, ...shadows.md,
  },
  ticketTitle: {
    fontSize: 16, fontWeight: '700', color: colors.purple[600], marginBottom: spacing.lg,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routeDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  routeConnector: {
    width: 2, height: 20, backgroundColor: colors.neutral[200],
    marginLeft: 4, marginVertical: 4,
  },
  stationText: { fontSize: 15, color: colors.text.primary, fontWeight: '500' },
  passengerInfo: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing.md,
  },
  passengerIcon: { fontSize: 14, marginRight: 4 },
  passengerCount: { fontSize: 13, color: colors.text.secondary },

  // ── QR Code ──
  qrContainer: { alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.xxl },
  qrWrapper: {
    padding: 12, borderWidth: 3, borderColor: colors.green[500],
    borderRadius: 8, backgroundColor: colors.neutral[0],
  },
  ticketId: { marginTop: 12, fontSize: 12, color: colors.text.secondary, fontWeight: '500' },

  // ── Payment Details ──
  paymentSection: {
    borderTopWidth: 1, borderTopColor: colors.neutral[100], paddingTop: spacing.lg,
  },
  paymentTitle: { fontSize: 14, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm },
  paymentRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 4, paddingVertical: 2,
  },
  paymentLabel: { fontSize: 13, color: colors.text.secondary },
  paymentValue: { fontSize: 13, fontWeight: '600', color: colors.text.primary },

  // ── Journey Companion ──
  companionCard: {
    backgroundColor: colors.surface, marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg, ...shadows.md,
    borderTopWidth: 3, overflow: 'hidden',
  },
  companionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  companionLive: { flexDirection: 'row', alignItems: 'center' },
  liveDot: {
    width: 8, height: 8, borderRadius: 4, marginRight: 8,
  },
  companionTitle: { fontSize: 14, fontWeight: '700', color: colors.purple[600] },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },

  companionBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },

  infoRow: { flexDirection: 'row', marginBottom: spacing.md },
  infoBlock: { flex: 1 },
  infoLabel: { fontSize: 11, color: colors.text.muted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  infoSub: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },

  interchangeRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.purple[50], padding: spacing.md,
    borderRadius: borderRadius.sm, marginBottom: spacing.md,
  },
  interchangeIcon: { fontSize: 18, marginRight: spacing.sm },
  interchangeText: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  interchangeSub: { fontSize: 11, color: colors.text.secondary, marginTop: 1 },

  etaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderTopWidth: 1,
    borderTopColor: colors.neutral[100], marginTop: spacing.xs,
  },
  etaLabel: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  etaValue: { fontSize: 18, fontWeight: '700', color: colors.purple[600] },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, borderRadius: borderRadius.sm,
    marginTop: spacing.sm, borderLeftWidth: 3,
  },
  alertIcon: { fontSize: 16, marginRight: spacing.sm },
  alertMessage: { fontSize: 13, fontWeight: '600' },
  alertDetail: { fontSize: 11, color: colors.text.secondary, marginTop: 2 },

  completedBody: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  completedIcon: { fontSize: 40, marginBottom: spacing.sm },
  completedText: { fontSize: 16, fontWeight: '700', color: colors.status.success, textAlign: 'center' },
  completedSub: { fontSize: 13, color: colors.text.secondary, marginTop: 4, textAlign: 'center' },

  viewJourneyBtn: {
    borderTopWidth: 1, borderTopColor: colors.neutral[100],
    paddingVertical: spacing.md, alignItems: 'center',
  },
  viewJourneyText: { fontSize: 14, fontWeight: '700', color: colors.purple[600] },
});
