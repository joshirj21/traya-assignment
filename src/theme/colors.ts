

export const rawColors = {

  background: '#FFFFFF',
  'on-background': '#111111',
  onBackground: '#111111',

  surface: '#FFFFFF',
  'surface-dim': '#F9FAFB',
  surfaceDim: '#F9FAFB',
  'surface-bright': '#FFFFFF',
  surfaceBright: '#FFFFFF',

  'surface-container-lowest': '#FFFFFF',
  surfaceContainerLowest: '#FFFFFF',
  'surface-container-low': '#FAFAFA',
  surfaceContainerLow: '#FAFAFA',
  'surface-container': '#F4F4F5',
  surfaceContainer: '#F4F4F5',
  'surface-container-high': '#E4E4E7',
  surfaceContainerHigh: '#E4E4E7',
  'surface-container-highest': '#D4D4D8',
  surfaceContainerHighest: '#D4D4D8',
  'surface-variant': '#F4F4F5',
  surfaceVariant: '#F4F4F5',
  'surface-tint': '#111111',
  surfaceTint: '#111111',

  'on-surface': '#111111',
  onSurface: '#111111',
  'on-surface-variant': '#666666',
  onSurfaceVariant: '#666666',
  muted: '#888888',

  'inverse-surface': '#18181B',
  inverseSurface: '#18181B',
  'inverse-on-surface': '#FAFAFA',
  inverseOnSurface: '#FAFAFA',
  'inverse-primary': '#FFFFFF',
  inversePrimary: '#FFFFFF',

  outline: '#D4D4D8',
  'outline-variant': '#E5E5E5',
  outlineVariant: '#E5E5E5',
  border: '#E5E5E5',

  primary: '#111111',
  'on-primary': '#FFFFFF',
  onPrimary: '#FFFFFF',
  'primary-container': '#F4F4F5',
  primaryContainer: '#F4F4F5',
  'on-primary-container': '#111111',
  onPrimaryContainer: '#111111',
  'primary-fixed': '#18181B',
  primaryFixed: '#18181B',
  'primary-fixed-dim': '#27272A',
  primaryFixedDim: '#27272A',
  'on-primary-fixed': '#FFFFFF',
  onPrimaryFixed: '#FFFFFF',
  'on-primary-fixed-variant': '#E4E4E7',
  onPrimaryFixedVariant: '#E4E4E7',

  secondary: '#4B5563',
  'on-secondary': '#FFFFFF',
  onSecondary: '#FFFFFF',
  'secondary-container': '#F3F4F6',
  secondaryContainer: '#F3F4F6',
  'on-secondary-container': '#1F2937',
  onSecondaryContainer: '#1F2937',
  'secondary-fixed': '#374151',
  secondaryFixed: '#374151',
  'secondary-fixed-dim': '#4B5563',
  secondaryFixedDim: '#4B5563',
  'on-secondary-fixed': '#FFFFFF',
  onSecondaryFixed: '#FFFFFF',
  'on-secondary-fixed-variant': '#E5E7EB',
  onSecondaryFixedVariant: '#E5E7EB',

  tertiary: '#6B7280',
  'on-tertiary': '#FFFFFF',
  onTertiary: '#FFFFFF',
  'tertiary-container': '#F3F4F6',
  tertiaryContainer: '#F3F4F6',
  'on-tertiary-container': '#374151',
  onTertiaryContainer: '#374151',
  'tertiary-fixed': '#4B5563',
  tertiaryFixed: '#4B5563',
  'tertiary-fixed-dim': '#6B7280',
  tertiaryFixedDim: '#6B7280',
  'on-tertiary-fixed': '#FFFFFF',
  onTertiaryFixed: '#FFFFFF',
  'on-tertiary-fixed-variant': '#E5E7EB',
  onTertiaryFixedVariant: '#E5E7EB',

  success: '#16A34A',
  onSuccess: '#FFFFFF',
  successContainer: '#DCFCE7',
  onSuccessContainer: '#166534',

  warning: '#D97706',
  onWarning: '#FFFFFF',
  warningContainer: '#FEF3C7',
  onWarningContainer: '#92400E',

  error: '#DC2626',
  'on-error': '#FFFFFF',
  onError: '#FFFFFF',
  'error-container': '#FEE2E2',
  errorContainer: '#FEE2E2',
  'on-error-container': '#991B1B',
  onErrorContainer: '#991B1B',
} as const;

export const primaryColors = {
  main: rawColors.primary,
  onPrimary: rawColors.onPrimary,
  container: rawColors.primaryContainer,
  onContainer: rawColors.onPrimaryContainer,
  fixed: rawColors.primaryFixed,
  fixedDim: rawColors.primaryFixedDim,
  onFixed: rawColors.onPrimaryFixed,
  onFixedVariant: rawColors.onPrimaryFixedVariant,
  inverse: rawColors.inversePrimary,
} as const;

export const secondaryColors = {
  main: rawColors.secondary,
  onSecondary: rawColors.onSecondary,
  container: rawColors.secondaryContainer,
  onContainer: rawColors.onSecondaryContainer,
  fixed: rawColors.secondaryFixed,
  fixedDim: rawColors.secondaryFixedDim,
  onFixed: rawColors.onSecondaryFixed,
  onFixedVariant: rawColors.onSecondaryFixedVariant,
} as const;

export const tertiaryColors = {
  main: rawColors.tertiary,
  onTertiary: rawColors.onTertiary,
  container: rawColors.tertiaryContainer,
  onContainer: rawColors.onTertiaryContainer,
  fixed: rawColors.tertiaryFixed,
  fixedDim: rawColors.tertiaryFixedDim,
  onFixed: rawColors.onTertiaryFixed,
  onFixedVariant: rawColors.onTertiaryFixedVariant,
} as const;

export const errorColors = {
  main: rawColors.error,
  onError: rawColors.onError,
  container: rawColors.errorContainer,
  onContainer: rawColors.onErrorContainer,
} as const;

export const surfaceColors = {
  default: rawColors.surface,
  dim: rawColors.surfaceDim,
  bright: rawColors.surfaceBright,
  containerLowest: rawColors.surfaceContainerLowest,
  containerLow: rawColors.surfaceContainerLow,
  container: rawColors.surfaceContainer,
  containerHigh: rawColors.surfaceContainerHigh,
  containerHighest: rawColors.surfaceContainerHighest,
  variant: rawColors.surfaceVariant,
  tint: rawColors.surfaceTint,
  onSurface: rawColors.onSurface,
  onSurfaceVariant: rawColors.onSurfaceVariant,
  inverseSurface: rawColors.inverseSurface,
  inverseOnSurface: rawColors.inverseOnSurface,
} as const;

export const textColors = {
  primary: rawColors.onSurface,
  secondary: rawColors.onSurfaceVariant,
  muted: rawColors.muted,
  inverse: rawColors.inverseOnSurface,
  onBackground: rawColors.onBackground,
  onPrimary: rawColors.onPrimary,
  onSecondary: rawColors.onSecondary,
  onTertiary: rawColors.onTertiary,
  onError: rawColors.onError,
} as const;

export const borderColors = {
  default: rawColors.outlineVariant,
  outline: rawColors.outline,
  outlineVariant: rawColors.outlineVariant,
  focus: rawColors.primary,
  error: rawColors.error,
} as const;

export const Colors = {
  ...rawColors,
  primaryGroup: primaryColors,
  secondaryGroup: secondaryColors,
  tertiaryGroup: tertiaryColors,
  errorGroup: errorColors,
  surfaceGroup: surfaceColors,
  textGroup: textColors,
  borderGroup: borderColors,
} as const;

export type ColorToken = keyof typeof rawColors;
export default Colors;
