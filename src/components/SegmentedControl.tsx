import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../theme/colors';
import { rounded } from '../theme/rounded';
import { shadow } from '../theme/shadow';
import { spacing } from '../theme/spacing';
import { fontFamily, fontWeight } from '../theme/typography';

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  selectedValue: T;
  onValueChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  selectedValue,
  onValueChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {options.map(option => {
        const isSelected = option.value === selectedValue;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onValueChange(option.value)}
            style={[styles.segment, isSelected && styles.selectedSegment]}
            activeOpacity={0.8}
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
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: rounded.base,
    padding: 2.5,
  },
  segment: {
    paddingVertical: 5,
    paddingHorizontal: spacing.spaceSm + 2,
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
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  selectedSegmentText: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    color: Colors.onSurface,
  },
});

export default SegmentedControl;
