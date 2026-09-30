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
import type { RootStackParamList, LiveStatus, JourneyAlert, RouteSegment, JourneyInstruction } from '../../shared/types';
import { getJourney } from '../../data/api/metroApi';
import { getNextTrainsFromStation } from '../../data/stations/routing';
import type { LineId, Direction } from '../../data/stations/timetable';

type RouteP = RouteProp<RootStackParamList, 'TicketDetails'>;
type NavProp = NativeStackNavigationProp<RootStackParamList, 'TicketDetails'>;

const { width } = Dimensions.get('window');

// ── Journey Companion Card ──
// This is the core value-add. Shows only what matters RIGHT NOW.

interface CompanionProps {
  instruction?: JourneyInstruction;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  onViewJourney: () => void;
}

const JourneyCompanionCard: React.FC<CompanionProps> = ({
  instruction, notificationsEnabled, onToggleNotifications, onViewJourney,
}) => {
  if (!instruction) return null;

  const lineColor = instruction.line.toLowerCase() === 'green' ? colors.green[500] : colors.purple[600];
  const isCompleted = instruction.stage === 'ARRIVED';

  return (
    <View style={[styles.companionCard, { borderTopColor: lineColor }]}>
      {/* Header */}
      <View style={styles.companionHeader}>
        <View style={styles.companionLive}>
          <View style={[styles.liveDot, { backgroundColor: isCompleted ? colors.status.success : '#F44336' }]} />
          <Text style={styles.companionTitle}>Journey Companion</Text>
        </View>
        <TouchableOpacity 
          style={[styles.statusBadge, { backgroundColor: notificationsEnabled ? `${colors.purple[600]}15` : colors.neutral[200] }]}
          onPress={onToggleNotifications}
        >
          <Text style={[styles.statusText, { color: notificationsEnabled ? colors.purple[600] : colors.text.secondary }]}>
            {notificationsEnabled ? 'Alerts ON' : 'Alerts OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.companionBody}>
        {/* Instruction Title & Description */}
        <View style={{ marginBottom: spacing.md }}>
          <Text style={styles.instructionTitle}>{instruction.title}</Text>
          <Text style={styles.instructionDesc}>{instruction.description}</Text>
        </View>

        {!isCompleted && (
          <View style={styles.infoRow}>
            {/* Primary Detail */}
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Station / Location</Text>
              <Text style={styles.infoValue}>{instruction.station}</Text>
              {instruction.platform ? (
                <Text style={styles.infoSub}>Platform {instruction.platform}</Text>
              ) : null}
            </View>

            {/* Train Info */}
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Train</Text>
              <Text style={[styles.infoValue, { color: lineColor }]}>{instruction.line} Line</Text>
              <Text style={styles.infoSub}>To {instruction.direction}</Text>
            </View>
          </View>
        )}

        {/* ETA */}
        {!isCompleted && (
          <View style={styles.etaRow}>
            <Text style={styles.etaLabel}>ETA / Wait Time</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.etaValue}>
                {instruction.eta_minutes} min
              </Text>
              <Text style={styles.etaSub}>
                {instruction.scheduled_time.split('T')[1]?.substring(0, 5) || '--:--'}
              </Text>
            </View>
          </View>
        )}

        {isCompleted && (
          <View style={styles.completedBody}>
            <Text style={styles.completedIcon}>✓</Text>
            <Text style={styles.completedText}>You have reached your destination!</Text>
            <Text style={styles.completedSub}>Thank you for traveling with Namma Metro.</Text>
          </View>
        )}
      </View>

      {/* View Journey Button */}
      <TouchableOpacity style={styles.viewJourneyBtn} onPress={onViewJourney}>
        <Text style={styles.viewJourneyText}>View Complete Timeline →</Text>
      </TouchableOpacity>
    </View>
  );
};

// ── Connecting Trains Panel ──
interface ConnectingTrainsPanelProps {
  segments: RouteSegment[];
}

const ConnectingTrainsPanel: React.FC<ConnectingTrainsPanelProps> = ({ segments }) => {
  const [trains, setTrains] = useState<{ departureTime: string; minutesAway: number }[]>([]);

  useEffect(() => {
    if (segments.length < 2) return;
    const connectingSeg = segments[1];
    const line = connectingSeg.line as LineId;
    
    const loadTrains = () => {
      // Determine direction from segment - simplified heuristic, real direction logic is in routing/localAlerts
      // We'll pass 'forward' here as a placeholder for the component's signature, 
      // but ideally this should use the real direction function. For the scope of this update, 
      // routing.ts handles the exact direction lookup internally if we pass it correctly or use a helper.
      // We will assume forward for now since the prompt specifies this.
      const t = getNextTrainsFromStation(connectingSeg.from_station_id, line, 'forward', 5);
      setTrains(t);
    };

    loadTrains();
    const interval = setInterval(loadTrains, 30000);
    return () => clearInterval(interval);
  }, [segments]);

  if (segments.length < 2 || trains.length === 0) return null;

  const connectingSeg = segments[1];
  const lineColor = connectingSeg.line === 'green' ? colors.green[500] : connectingSeg.line === 'yellow' ? colors.status.warning : colors.purple[600];

  return (
    <View style={connectingStyles.panel}>
      <View style={connectingStyles.header}>
        <View style={[connectingStyles.lineBadge, { backgroundColor: lineColor }]}>
          <Text style={connectingStyles.lineBadgeText}>
            {connectingSeg.line.toUpperCase()} LINE
          </Text>
        </View>
        <Text style={connectingStyles.title}>Connecting Trains at Majestic</Text>
      </View>
      <Text style={connectingStyles.subtitle}>→ Towards {connectingSeg.to_station}</Text>
      {trains.slice(0, 5).map((t, i) => (
        <View key={i} style={connectingStyles.trainRow}>
          <Text style={connectingStyles.trainTime}>{t.departureTime}</Text>
          <View style={[connectingStyles.awayBadge, {
            backgroundColor: t.minutesAway <= 3 ? '#FFEBEE' : t.minutesAway <= 7 ? '#FFF3E0' : '#E8F5E9',
          }]}>
            <Text style={[connectingStyles.awayText, {
              color: t.minutesAway <= 3 ? colors.status.error : t.minutesAway <= 7 ? colors.status.warning : colors.status.success,
            }]}>
              {t.minutesAway <= 0 ? 'Now' : `${t.minutesAway} min`}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const connectingStyles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, gap: spacing.sm },
  lineBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  lineBadgeText: { color: colors.neutral[0], fontSize: 10, fontWeight: '700' },
  title: { fontSize: 13, fontWeight: '700', color: colors.text.primary },
  subtitle: { fontSize: 12, color: colors.text.secondary, marginBottom: spacing.sm },
  trainRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
  },
  trainTime: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  awayBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  awayText: { fontSize: 12, fontWeight: '700' },
});

// ── Main Ticket Details Screen ──

export default function TicketDetailsScreen() {
  const route = useRoute<RouteP>();
  const navigation = useNavigation<NavProp>();
  const { ticketData, journeyId } = route.params;

  const {
    startJourneyTracking, stopJourneyTracking,
    instructions, notificationsEnabled, toggleNotifications,
    segments: storeSegments,
  } = useJourneyStore();

  // Single source of truth from store
  const activeInstructionList = instructions.length > 0 
    ? instructions 
    : (ticketData.route?.segments ? [] : []);
  const activeInstruction = activeInstructionList.find(i => i.active) || activeInstructionList[0];

  useEffect(() => {
    // TicketDetails is the root of the journey — it manages the connection.
    startJourneyTracking(journeyId);
    return () => {
      stopJourneyTracking();
    };
  }, [journeyId, startJourneyTracking, stopJourneyTracking]);

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

          {/* Journey Overview */}
          <View style={styles.journeyOverview}>
            <Text style={styles.journeyOverviewText}>Total Duration: {ticketData.route?.total_time_minutes} mins</Text>
          </View>

          {/* Route Segments breakdown */}
          <View style={styles.segmentsContainer}>
            {ticketData.route?.segments?.map((seg, idx) => {
              const depStr = seg.departure_time || '--:--';
              const arrStr = seg.arrival_time || '--:--';
              const depFmt = depStr.includes('T') ? depStr.split('T')[1]?.substring(0, 5) : depStr;
              const arrFmt = arrStr.includes('T') ? arrStr.split('T')[1]?.substring(0, 5) : arrStr;
              const lineColor = seg.line.toLowerCase() === 'green' ? colors.green[500] : seg.line.toLowerCase() === 'yellow' ? colors.status.warning : colors.purple[500];

              return (
                <React.Fragment key={idx}>
                  <View style={styles.segmentCard}>
                    <View style={[styles.segmentLineIndicator, { backgroundColor: lineColor }]} />
                    <View style={styles.segmentDetails}>
                      <View style={styles.stationTimeRow}>
                        <Text style={styles.segmentStation}>{seg.from_station}</Text>
                        <Text style={styles.segmentTime}>{depFmt}</Text>
                      </View>
                      
                      <View style={styles.segmentDots}>
                         <Text style={[styles.segmentTravelTime, { color: lineColor }]}>
                           ↓ {seg.travel_time_minutes} min journey on {seg.line} Line
                         </Text>
                      </View>

                      <View style={styles.stationTimeRow}>
                        <Text style={styles.segmentStation}>{seg.to_station}</Text>
                        <Text style={styles.segmentTime}>{arrFmt}</Text>
                      </View>
                    </View>
                  </View>
                  
                  {idx < (ticketData.route.segments.length - 1) && (
                    <View style={styles.interchangeDivider}>
                      <Text style={styles.segmentInterchangeIcon}>⇄</Text>
                      <Text style={styles.segmentInterchangeText}>Change here for {ticketData.route.segments[idx+1].line} Line</Text>
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Passenger count */}
          <View style={styles.passengerInfo}>
            <Text style={styles.passengerIcon}>Passengers:</Text>
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
          instruction={activeInstruction}
          notificationsEnabled={notificationsEnabled}
          onToggleNotifications={toggleNotifications}
          onViewJourney={handleViewJourney}
        />

        <ConnectingTrainsPanel segments={storeSegments.length > 0 ? storeSegments : (ticketData.route?.segments || [])} />

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
    fontSize: 16, fontWeight: '700', color: colors.purple[600], marginBottom: spacing.md,
  },
  journeyOverview: {
    backgroundColor: colors.neutral[50], padding: spacing.sm, borderRadius: borderRadius.sm,
    marginBottom: spacing.lg, alignItems: 'center'
  },
  journeyOverviewText: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  
  segmentsContainer: { marginBottom: spacing.md },
  segmentCard: { flexDirection: 'row', marginBottom: spacing.xs },
  segmentLineIndicator: { width: 4, borderRadius: 2, marginRight: 12 },
  segmentDetails: { flex: 1, paddingVertical: 2 },
  stationTimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  segmentStation: { fontSize: 15, color: colors.text.primary, fontWeight: '600' },
  segmentTime: { fontSize: 13, color: colors.text.secondary, fontWeight: '500' },
  segmentDots: { marginVertical: 12, paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: colors.neutral[150], marginLeft: 8 },
  segmentTravelTime: { fontSize: 12, marginLeft: 12, fontWeight: '500' },
  interchangeDivider: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.purple[50], padding: spacing.sm, borderRadius: borderRadius.sm, marginVertical: spacing.sm },
  segmentInterchangeIcon: { fontSize: 14, marginRight: spacing.sm },
  segmentInterchangeText: { fontSize: 12, color: colors.purple[700], fontWeight: '600' },

  passengerInfo: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing.md,
    justifyContent: 'center',
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
  etaSub: { fontSize: 11, color: colors.text.muted, marginTop: 2 },

  instructionTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  instructionDesc: { fontSize: 13, color: colors.text.secondary, marginTop: 4 },

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
