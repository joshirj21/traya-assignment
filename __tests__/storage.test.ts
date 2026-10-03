import {
  clearUserDetailsFromStorage,
  getUserDetailsFromStorage,
  isUserOnboardingComplete,
  saveUserDetailsToStorage,
  STORAGE_KEYS,
  storage,
} from '../src/lib/storage';
import { UserDetailsResponse } from '../src/services/userService';

describe('MMKV Storage & Onboarding State', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('returns null and false when storage is empty on cold launch', () => {
    expect(getUserDetailsFromStorage()).toBeNull();
    expect(isUserOnboardingComplete()).toBe(false);
  });

  it('saves user details with isOnboardingDone: true', () => {
    const mockResponse: UserDetailsResponse = {
      user: {
        name: 'Rahul Joshi',
        age: 28,
        height: 170,
        weight: 60,
      },
    };

    const stored = saveUserDetailsToStorage(mockResponse);

    expect(stored.isOnboardingDone).toBe(true);
    expect(stored.user.name).toBe('Rahul Joshi');
    expect(stored.user.age).toBe(28);

    const rawString = storage.getString(STORAGE_KEYS.USER_DETAILS);
    expect(rawString).toBeDefined();

    const parsed = JSON.parse(rawString!);
    expect(parsed.isOnboardingDone).toBe(true);
    expect(parsed.user.height).toBe(170);

    expect(isUserOnboardingComplete()).toBe(true);
    expect(getUserDetailsFromStorage()?.user.name).toBe('Rahul Joshi');
  });

  it('handles clearing storage cleanly', () => {
    saveUserDetailsToStorage({
      user: { name: 'Test User', age: 25, height: 180, weight: 75 },
    });

    expect(isUserOnboardingComplete()).toBe(true);

    clearUserDetailsFromStorage();

    expect(getUserDetailsFromStorage()).toBeNull();
    expect(isUserOnboardingComplete()).toBe(false);
  });
});
