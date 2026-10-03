import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../theme/colors';
import { rounded } from '../theme/rounded';
import { shadow } from '../theme/shadow';
import { spacing } from '../theme/spacing';
import { fontFamily, fontWeight } from '../theme/typography';
import { TimelinePeriod } from '../types/metrics';

interface TimelineOption {
  label: string;
  value: TimelinePeriod;
}

const TIMELINE_OPTIONS: TimelineOption[] = [
  { label: '7 Days', value: '7_days' },
  { label: '30 Days', value: '30_days' },
  { label: '3 Months', value: '3_months' },
];

interface TimelineFilterProps {
  selectedPeriod: TimelinePeriod;
  onSelectPeriod: (period: TimelinePeriod) => void;
}

export const TimelineFilter: React.FC<TimelineFilterProps> = ({
  selectedPeriod,
  onSelectPeriod,
}) => {
  return (
    <View style={styles.container}>
      {TIMELINE_OPTIONS.map(option => {
        const isSelected = option.value === selectedPeriod;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onSelectPeriod(option.value)}
            style={[styles.segment, isSelected && styles.selectedSegment]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              style={[
                styles.segmentText,
                isSelected && styles.selectedSegmentText,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: rounded.base,
    padding: 3,
    marginBottom: spacing.spaceMd,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: rounded.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSegment: {
    backgroundColor: Colors.surface,
    ...shadow.subtle,
  },
  segmentText: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  selectedSegmentText: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
  },
});

export default TimelineFilter;
