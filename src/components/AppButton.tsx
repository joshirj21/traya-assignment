import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Colors } from '../theme/colors';
import { rounded } from '../theme/rounded';
import { spacing } from '../theme/spacing';
import { fontFamily, fontWeight } from '../theme/typography';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}) => {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';

  const containerStyle = [
    styles.baseContainer,
    isPrimary && styles.primaryContainer,
    isSecondary && styles.secondaryContainer,
    isOutline && styles.outlineContainer,
    disabled && styles.disabledContainer,
    style,
  ];

  const labelStyle = [
    styles.baseText,
    isPrimary && styles.primaryText,
    isSecondary && styles.secondaryText,
    isOutline && styles.outlineText,
    disabled && styles.disabledText,
    textStyle,
  ];

  const spinnerColor = isPrimary ? Colors.onPrimary : Colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={containerStyle}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {leftIcon ? <>{leftIcon}</> : null}
          <Text style={labelStyle}>{title}</Text>
          {rightIcon ? <>{rightIcon}</> : null}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    height: 48,
    borderRadius: rounded.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.spaceLg,
    gap: spacing.spaceSm,
  },
  primaryContainer: {
    backgroundColor: Colors.primary,
  },
  secondaryContainer: {
    backgroundColor: Colors.surfaceContainer,
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disabledContainer: {
    backgroundColor: Colors.surfaceContainer,
    opacity: 0.5,
  },
  baseText: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 15,
    letterSpacing: -0.1,
  },
  primaryText: {
    color: Colors.onPrimary,
  },
  secondaryText: {
    color: Colors.onSurface,
  },
  outlineText: {
    color: Colors.onSurface,
  },
  disabledText: {
    color: Colors.onSurfaceVariant,
  },
});

export default AppButton;
