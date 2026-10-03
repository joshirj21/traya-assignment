

import Colors from './colors';
import Typography from './typography';
import spacing from './spacing';
import shadow from './shadow';
import rounded from './rounded';

export { default as Colors } from './colors';
export { default as Typography } from './typography';
export { default as spacing } from './spacing';
export { default as shadow } from './shadow';
export { default as rounded } from './rounded';

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadow';
export * from './rounded';

const theme = {
  colors: Colors,
  typography: Typography,
  spacing,
  shadow,
  rounded,
} as const;

export type Theme = typeof theme;

export default theme;
