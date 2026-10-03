import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LogWeightScreen } from '../screens/LogWeightScreen';
import { MetricHistoryScreen } from '../screens/MetricHistoryScreen';
import { RootStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';
import { isUserOnboardingComplete } from '../lib/storage';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  initialRoute?: keyof RootStackParamList;
}

export const RootNavigator: React.FC<RootNavigatorProps> = ({
  initialRoute,
}) => {
  const defaultRoute: keyof RootStackParamList =
    initialRoute ?? (isUserOnboardingComplete() ? 'Homepage' : 'Onboarding');

  return (
    <Stack.Navigator
      initialRouteName={defaultRoute}
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: Colors.background,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Homepage" component={HomeScreen} />
      <Stack.Screen name="LogWeight" component={LogWeightScreen} />
      <Stack.Screen name="MetricHistory" component={MetricHistoryScreen} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
