import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../theme/colors';
import { rounded } from '../theme/rounded';
import { shadow } from '../theme/shadow';
import { spacing } from '../theme/spacing';
import { fontFamily, fontWeight } from '../theme/typography';
import { MetricItem } from '../types/metrics';
import { MetricIcon } from './MetricIcon';

interface MetricCardProps {
  metric: MetricItem;
  onPress?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({ metric, onPress }) => {
  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${metric.title}: ${metric.value} ${
        metric.unit || ''
      }`}
    >

      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MetricIcon name={metric.iconName} size={16} />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {metric.title}
        </Text>
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.value}>{metric.value}</Text>
        {metric.unit ? <Text style={styles.unit}>{metric.unit}</Text> : null}
      </View>

      {metric.goal || metric.subtitle ? (
        <Text style={styles.subtext} numberOfLines={1}>
          {metric.goal ?? metric.subtitle}
        </Text>
      ) : null}
    </CardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: rounded.lg,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 116,
    justifyContent: 'space-between',
    ...shadow.subtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.spaceXs,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: rounded.sm,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    letterSpacing: -0.1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 2,
  },
  value: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.onSurface,
    letterSpacing: -0.4,
  },
  unit: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  subtext: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: Colors.muted,
    marginTop: 2,
  },
});

export default MetricCard;
