

import React, { useEffect, useMemo } from 'react';
import { AppState, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BootSplash from 'react-native-bootsplash';
import { RootNavigator } from './src/navigation';
import { Colors } from './src/theme/colors';
import {
  isHealthKitConnectedInStorage,
  isUserOnboardingComplete,
} from './src/lib/storage';
import { healthSyncManager } from './src/health';
import { RootStackParamList } from './src/types/navigation';
import { syncQueueProcessor } from './src/sync/syncQueueProcessor';

const navTheme = {
  dark: false,
  colors: {
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.onSurface,
    border: Colors.border,
    notification: Colors.primary,
  },
  fonts: {
    regular: {
      fontFamily: 'Inter-Regular',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'Inter-Medium',
      fontWeight: '500' as const,
    },
    bold: {
      fontFamily: 'Inter-Bold',
      fontWeight: '700' as const,
    },
    heavy: {
      fontFamily: 'Inter-ExtraBold',
      fontWeight: '800' as const,
    },
  },
};

function App(): React.JSX.Element {

  const initialRoute: keyof RootStackParamList = useMemo(() => {
    return isUserOnboardingComplete() ? 'Homepage' : 'Onboarding';
  }, []);

  useEffect(() => {
    BootSplash.hide({ fade: true });
    syncQueueProcessor.processPendingQueue().catch(error => {
      console.warn('Startup offline queue processing failed:', error);
    });

    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', nextState => {
      const resumed =
        (previousState === 'background' || previousState === 'inactive') &&
        nextState === 'active';
      previousState = nextState;
      if (resumed) {
        syncQueueProcessor.processPendingQueue().catch(error => {
          console.warn('Foreground offline queue processing failed:', error);
        });
      }
    });

    if (isHealthKitConnectedInStorage()) {
      healthSyncManager.initialize();
    }
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer theme={navTheme}>
        <RootNavigator initialRoute={initialRoute} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
