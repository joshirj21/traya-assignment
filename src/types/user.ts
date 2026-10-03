export type WeightUnit = 'kg';
export type HeightUnit = 'cm';

export interface UserProfile {
  name: string;
  age: number;
  weight: number;
  weightUnit: WeightUnit;
  height: number;
  heightUnit: HeightUnit;
  createdAt: string;
}

export interface OnboardingFormState {
  name: string;
  age: string;
  weight: string;
  height: string;
}
