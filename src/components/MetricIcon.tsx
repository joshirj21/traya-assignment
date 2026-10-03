import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Colors } from '../theme/colors';

export type MetricIconType =
  | 'weight'
  | 'steps'
  | 'sleep'
  | 'calories'
  | 'water'
  | 'activity'
  | 'target'
  | 'sync'
  | 'edit'
  | 'import';

interface MetricIconProps {
  name: MetricIconType;
  size?: number;
  color?: string;
}

export const MetricIcon: React.FC<MetricIconProps> = ({
  name,
  size = 18,
  color = Colors.onSurface,
}) => {
  const renderIconSymbol = () => {
    switch (name) {
      case 'weight':
        return '⚖️';
      case 'steps':
        return '👟';
      case 'sleep':
        return '🌙';
      case 'calories':
        return '🔥';
      case 'water':
        return '💧';
      case 'activity':
        return '⚡';
      case 'target':
        return '🎯';
      case 'sync':
        return '🔄';
      case 'edit':
        return '✏️';
      case 'import':
        return '📥';
      default:
        return '📊';
    }
  };

  return (
    <View style={[styles.container, { width: size + 8, height: size + 8 }]}>
      <Text style={{ fontSize: size }}>{renderIconSymbol()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MetricIcon;
