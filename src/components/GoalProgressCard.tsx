import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import { rounded } from '../theme/rounded';
import { shadow } from '../theme/shadow';
import { spacing } from '../theme/spacing';
import { fontFamily, fontWeight } from '../theme/typography';
import { WeightGoal } from '../types/metrics';

interface GoalProgressCardProps {
  goal: WeightGoal;
}

export const GoalProgressCard: React.FC<GoalProgressCardProps> = ({ goal }) => {
  console.log('ln15', goal);
  const progressPercent = Math.min(Math.max(goal.progressPercent, 0), 100);

  return (
    <View style={styles.card}>

      <View style={styles.header}>
        <Text style={styles.title}>ACTIVE GOAL PROGRESS</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{progressPercent}% Completed</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <Text style={styles.targetText}>
          Target Weight:{' '}
          <Text style={styles.targetValue}>
            {goal.targetWeight.toFixed(1)} kg
          </Text>
        </Text>
        <Text style={styles.remainingText}>
          {goal.remainingKg > 0
            ? `${goal.remainingKg.toFixed(1)} kg remaining`
            : 'Goal Reached! 🎉'}
        </Text>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: rounded.lg,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: spacing.spaceLg,
    ...shadow.subtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: Colors.successContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.sm,
  },
  badgeText: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 11,
    color: Colors.onSuccessContainer,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.spaceSm,
  },
  targetText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  targetValue: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
  },
  remainingText: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: rounded.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: rounded.full,
  },
});

export default GoalProgressCard;
