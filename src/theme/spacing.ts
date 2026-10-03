

import { moderateScale, scale, verticalScale } from 'react-native-size-matters';

export const s = scale;
export const vs = verticalScale;
export const ms = (size: number, factor = 0.3) => moderateScale(size, factor);

export const spacing = {

  none: 0,

  'space-xs': 4,
  spaceXs: 4,
  xs: 4,

  'space-sm': 8,
  spaceSm: 8,
  sm: 8,

  gutter: 16,
  margin: 16,
  'space-md': 16,
  spaceMd: 16,
  md: 16,
  base: 16,

  'space-lg': 24,
  spaceLg: 24,
  lg: 24,
  xl: 24,

  'space-xl': 32,
  spaceXl: 32,
  xxl: 32,
} as const;

export const inset = {
  xs: { padding: spacing.xs },
  sm: { padding: spacing.sm },
  md: { padding: spacing.md },
  base: { padding: spacing.base },
  lg: { padding: spacing.lg },
  xl: { padding: spacing['space-xl'] },

  gutter: { padding: spacing.gutter },
  screen: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.spaceLg,
  },
  hGutter: { paddingHorizontal: spacing.gutter },
  vGutter: { paddingVertical: spacing.gutter },
} as const;

export type Spacing = typeof spacing;
export default spacing;
