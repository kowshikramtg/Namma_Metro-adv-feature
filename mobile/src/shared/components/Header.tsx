/**
 * Shared Header component — purple top bar matching Namma Metro style.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../navigation/theme';

interface HeaderProps {
  title: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = true }) => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.purple[600]} barStyle="light-content" />
      <View style={styles.content}>
        {showBack && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.purple[600],
    paddingTop: StatusBar.currentHeight || 44,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  backIcon: {
    color: colors.neutral[0],
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 28,
  },
  title: {
    color: colors.neutral[0],
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
});
