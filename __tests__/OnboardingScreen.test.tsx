import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { OnboardingScreen } from '../src/screens/OnboardingScreen';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      replace: mockNavigate,
    }),
  };
});

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders onboarding form components accurately', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <NavigationContainer>
          <OnboardingScreen />
        </NavigationContainer>,
      );
    });

    expect(tree).toBeDefined();
    const json = tree?.toJSON();
    expect(json).toBeTruthy();
  });
});
