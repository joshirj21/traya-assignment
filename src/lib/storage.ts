

import { createMMKV, MMKV } from 'react-native-mmkv';
import { UserDetailsResponse } from '../services/userService';

export const storage: MMKV = createMMKV();

export const STORAGE_KEYS = {
  USER_DETAILS: 'userDetails',
  HEALTHKIT_AVAILABLE: 'healthKitAvailable',
  HEALTHKIT_CONNECTED: 'healthKitConnected',
} as const;

export interface StoredUserDetails extends UserDetailsResponse {
  isOnboardingDone: boolean;
}

export const isHealthKitAvailableInStorage = (): boolean => {
  try {
    const val = storage.getBoolean(STORAGE_KEYS.HEALTHKIT_AVAILABLE);
    return typeof val === 'boolean' ? val : true;
  } catch {
    return true;
  }
};

export const setHealthKitAvailableInStorage = (available: boolean): void => {
  try {
    storage.set(STORAGE_KEYS.HEALTHKIT_AVAILABLE, available);
  } catch (e) {
    console.error('Error saving healthKitAvailable to MMKV:', e);
  }
};

export const isHealthKitConnectedInStorage = (): boolean => {
  try {
    return Boolean(storage.getBoolean(STORAGE_KEYS.HEALTHKIT_CONNECTED));
  } catch {
    return false;
  }
};

export const setHealthKitConnectedInStorage = (connected: boolean): void => {
  try {
    storage.set(STORAGE_KEYS.HEALTHKIT_CONNECTED, connected);
  } catch (e) {
    console.error('Error saving healthKitConnected to MMKV:', e);
  }
};

export const getUserDetailsFromStorage = (): StoredUserDetails | null => {
  try {
    const raw = storage.getString(STORAGE_KEYS.USER_DETAILS);
    if (!raw) return null;
    return JSON.parse(raw) as StoredUserDetails;
  } catch (error) {
    console.error('Error reading userDetails from MMKV storage:', error);
    return null;
  }
};

export const saveUserDetailsToStorage = (
  response: UserDetailsResponse,
): StoredUserDetails => {
  const dataToStore: StoredUserDetails = {
    ...response,
    isOnboardingDone: true,
  };

  storage.set(STORAGE_KEYS.USER_DETAILS, JSON.stringify(dataToStore));
  return dataToStore;
};

export const isUserOnboardingComplete = (): boolean => {
  const userDetails = getUserDetailsFromStorage();
  return Boolean(userDetails && userDetails.isOnboardingDone === true);
};

export const clearUserDetailsFromStorage = (): void => {
  storage.remove(STORAGE_KEYS.USER_DETAILS);
};
