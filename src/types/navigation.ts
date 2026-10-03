import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Onboarding: undefined;
  Homepage: undefined;
  Dashboard?: undefined;
  LogWeight?: {
    initialDate?: string;
  };
  MetricHistory: {
    metricId: string;
    metricTitle: string;
    unit?: string;
  };
};

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
