

export const rounded = {

  xs: 4,

  sm: 6,

  DEFAULT: 8,
  base: 8,

  md: 10,

  lg: 12,

  xl: 16,

  full: 9999,
} as const;

export type Rounded = typeof rounded;
export default rounded;
