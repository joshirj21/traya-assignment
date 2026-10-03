import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../theme/colors';
import { rounded } from '../theme/rounded';
import { shadow } from '../theme/shadow';
import { spacing } from '../theme/spacing';
import { fontFamily, fontWeight } from '../theme/typography';
import { MetricIcon } from './MetricIcon';

interface ExternalSourcesCardProps {
  isConnected?: boolean;
  isConnecting?: boolean;
  lastSyncedAt?: string;
  onConnect: () => void;
}

export const ExternalSourcesCard: React.FC<ExternalSourcesCardProps> = ({
  isConnected = false,
  isConnecting = false,
  lastSyncedAt,
  onConnect,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.contentRow}>

        <View style={styles.iconContainer}>
          <MetricIcon name="activity" size={18} color={Colors.onSurface} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Apple Health</Text>
          <Text style={styles.subtitle}>
            {isConnected
              ? 'Sample health metrics synced (demo)'
              : 'Connect the mock Apple Health source'}
          </Text>
          {isConnected && lastSyncedAt ? (
            <Text style={styles.syncedText}>Synced: {lastSyncedAt}</Text>
          ) : null}
        </View>

        {isConnected ? (
          <View style={styles.connectedBadge}>
            <View style={styles.connectedDot} />
            <Text style={styles.connectedText}>Connected</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.connectBtn,
              isConnecting && styles.connectBtnDisabled,
            ]}
            onPress={onConnect}
            disabled={isConnecting}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Connect Apple Health"
          >
            {isConnecting ? (
              <ActivityIndicator size="small" color={Colors.onPrimary} />
            ) : (
              <Text style={styles.connectBtnText}>Connect</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: rounded.lg,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: spacing.spaceMd,
    ...shadow.subtle,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: rounded.base,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.spaceMd,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.spaceSm,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 13,
    color: Colors.onSurface,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  syncedText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: Colors.muted,
    marginTop: 2,
  },
  connectBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: rounded.base,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtnDisabled: {
    opacity: 0.7,
  },
  connectBtnText: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 12,
    color: Colors.onPrimary,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.full,
    gap: 5,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  connectedText: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 11,
    color: Colors.onSuccessContainer,
  },
});

export default ExternalSourcesCard;
