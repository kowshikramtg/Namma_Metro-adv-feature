/**
 * Notification Overlay — In-app alert banners for journey events.
 * Slide-down banners triggered by journey store alerts.
 * No fake notifications — only displays alerts from the alert engine.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
} from 'react-native';
import { useJourneyStore } from '../../data/store/journeyStore';
import { colors, spacing, borderRadius, shadows } from '../../navigation/theme';
import type { JourneyAlert } from '../../shared/types';
import { scheduleLocalNotification } from './PushNotificationManager';

const BANNER_DURATION_MS = 5000;

export const NotificationOverlay: React.FC = () => {
  const { alerts } = useJourneyStore();
  const [visibleAlert, setVisibleAlert] = useState<JourneyAlert | null>(null);
  const [lastAlertId, setLastAlertId] = useState<string>('');
  const slideAnim = useState(() => new Animated.Value(-100))[0];

  const showBanner = useCallback((alert: JourneyAlert) => {
    setVisibleAlert(alert);
    setLastAlertId(alert.id);

    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(BANNER_DURATION_MS),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setVisibleAlert(null));
  }, [slideAnim]);

  const dismiss = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisibleAlert(null));
  }, [slideAnim]);

  // Watch for new alerts from store
  useEffect(() => {
    if (alerts.length > 0) {
      // Find the most recent alert by timestamp, or use the last one if timestamps are equal
      const sortedAlerts = [...alerts].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      });
      const latest = sortedAlerts[0];
      if (latest && latest.id !== lastAlertId && latest.priority !== 'low') {
        showBanner(latest);
        scheduleLocalNotification(
          `${latest.icon} ${latest.title}`,
          latest.message + (latest.detail ? ` — ${latest.detail}` : ''),
          { alertId: latest.id, type: latest.type }
        ).catch(() => {});
      }
    }
  }, [alerts, lastAlertId, showBanner]);

  if (!visibleAlert) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [{ translateY: slideAnim }],
          borderLeftColor: visibleAlert.color || colors.purple[600],
        },
      ]}
    >
      <TouchableOpacity style={styles.bannerContent} onPress={dismiss} activeOpacity={0.9}>
        <Text style={styles.icon}>{visibleAlert.icon}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{visibleAlert.title}</Text>
          <Text style={styles.message}>{visibleAlert.message}</Text>
          {visibleAlert.detail ? (
            <Text style={styles.detail}>{visibleAlert.detail}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    ...shadows.lg,
    zIndex: 1000,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  icon: { fontSize: 24, marginRight: spacing.md },
  textContainer: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700', color: colors.text.primary },
  message: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  detail: { fontSize: 11, color: colors.text.muted, marginTop: 2 },
});
