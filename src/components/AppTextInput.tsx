import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Colors } from '../theme/colors';
import { rounded } from '../theme/rounded';
import { spacing } from '../theme/spacing';
import { fontFamily, fontWeight } from '../theme/typography';

interface AppTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  rightAccessory?: React.ReactNode;
  leftAccessory?: React.ReactNode;
}

export const AppTextInput: React.FC<AppTextInputProps> = ({
  label,
  error,
  helperText,
  containerStyle,
  inputStyle,
  rightAccessory,
  leftAccessory,
  onFocus,
  onBlur,
  ...restProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const hasError = Boolean(error);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          hasError && styles.inputContainerError,
        ]}
      >
        {leftAccessory ? (
          <View style={styles.leftAccessory}>{leftAccessory}</View>
        ) : null}

        <TextInput
          placeholderTextColor={Colors.muted}
          style={[styles.input, inputStyle]}
          onFocus={e => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...restProps}
        />

        {rightAccessory ? (
          <View style={styles.rightAccessory}>{rightAccessory}</View>
        ) : null}
      </View>

      {hasError ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.spaceMd,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 13,
    color: Colors.onSurface,
    marginBottom: spacing.spaceXs + 2,
    letterSpacing: -0.1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: rounded.base,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: spacing.spaceMd,
    minHeight: 48,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  inputContainerError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: Colors.onSurface,
    paddingVertical: spacing.spaceSm,
  },
  leftAccessory: {
    marginRight: spacing.spaceSm,
  },
  rightAccessory: {
    marginLeft: spacing.spaceSm,
  },
  helperText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
    marginLeft: 2,
  },
  errorText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 2,
  },
});

export default AppTextInput;
