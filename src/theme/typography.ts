

import { TextStyle } from 'react-native';

export const fontFamily = {
  inter: 'Inter',
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extraBold: 'Inter-ExtraBold',
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
} as const;

export const fontSize = {
  labelSm: 11,
  labelMd: 13,
  bodyMd: 14,
  bodyLg: 16,
  headlineSm: 17,
  headlineMd: 20,
  headlineLgMobile: 22,
  headlineLg: 24,
  metricMd: 24,
  displayLgMobile: 28,
  metricHugeMobile: 32,
  displayLg: 32,
  metricHuge: 36,
} as const;

export const textVariants = {

  'display-lg': {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.displayLg,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.6,
  } as TextStyle,
  displayLg: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.displayLg,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.6,
  } as TextStyle,

  'display-lg-mobile': {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.displayLgMobile,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.5,
  } as TextStyle,
  displayLgMobile: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.displayLgMobile,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.5,
  } as TextStyle,

  'headline-lg': {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.headlineLg,
    fontWeight: '600',
    lineHeight: 30,
    letterSpacing: -0.4,
  } as TextStyle,
  headlineLg: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.headlineLg,
    fontWeight: '600',
    lineHeight: 30,
    letterSpacing: -0.4,
  } as TextStyle,

  'headline-lg-mobile': {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.headlineLgMobile,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.3,
  } as TextStyle,
  headlineLgMobile: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.headlineLgMobile,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.3,
  } as TextStyle,

  'headline-md': {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.headlineMd,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.2,
  } as TextStyle,
  headlineMd: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.headlineMd,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.2,
  } as TextStyle,

  'headline-sm': {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.headlineSm,
    fontWeight: '600',
    lineHeight: 22,
  } as TextStyle,
  headlineSm: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.headlineSm,
    fontWeight: '600',
    lineHeight: 22,
  } as TextStyle,

  'metric-huge': {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.metricHuge,
    fontWeight: '700',
    lineHeight: 42,
    letterSpacing: -0.8,
  } as TextStyle,
  metricHuge: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.metricHuge,
    fontWeight: '700',
    lineHeight: 42,
    letterSpacing: -0.8,
  } as TextStyle,

  'metric-huge-mobile': {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.metricHugeMobile,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.6,
  } as TextStyle,
  metricHugeMobile: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.metricHugeMobile,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.6,
  } as TextStyle,

  'metric-md': {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.metricMd,
    fontWeight: '600',
    lineHeight: 30,
    letterSpacing: -0.4,
  } as TextStyle,
  metricMd: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.metricMd,
    fontWeight: '600',
    lineHeight: 30,
    letterSpacing: -0.4,
  } as TextStyle,

  'body-lg': {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyLg,
    fontWeight: '400',
    lineHeight: 24,
  } as TextStyle,
  bodyLg: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyLg,
    fontWeight: '400',
    lineHeight: 24,
  } as TextStyle,

  'body-md': {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyMd,
    fontWeight: '400',
    lineHeight: 20,
  } as TextStyle,
  bodyMd: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyMd,
    fontWeight: '400',
    lineHeight: 20,
  } as TextStyle,

  'label-md': {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.labelMd,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: 0.1,
  } as TextStyle,
  labelMd: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.labelMd,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: 0.1,
  } as TextStyle,

  'label-sm': {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.labelSm,
    fontWeight: '500',
    lineHeight: 14,
    letterSpacing: 0.2,
  } as TextStyle,
  labelSm: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.labelSm,
    fontWeight: '500',
    lineHeight: 14,
    letterSpacing: 0.2,
  } as TextStyle,
} as const;

export const Typography = {
  fontFamily,
  fontWeight,
  fontSize,
  textVariants,
} as const;

export type TextVariant = keyof typeof textVariants;
export default Typography;
