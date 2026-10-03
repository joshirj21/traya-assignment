import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { HomeScreen } from '../src/screens/HomeScreen';
import { saveUserDetailsToStorage, storage } from '../src/lib/storage';
import { mockNetworkClient } from '../src/lib/mockNetworkClient';
import { metricsService } from '../src/services/metricsService';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      replace: mockNavigate,
      goBack: jest.fn(),
    }),
  };
});

function getAllText(root: ReactTestRenderer.ReactTestInstance): string {
  const texts: string[] = [];
  const findText = (node: any) => {
    if (typeof node === 'string' || typeof node === 'number') {
      texts.push(String(node));
    } else if (node?.children) {
      node.children.forEach(findText);
    }
  };
  findText(root);
  return texts.join(' ');
}

describe('HomeScreen Integration', () => {
  beforeEach(() => {
    storage.clearAll();
    mockNetworkClient.setSimulationConfig({ latency: 0 });
  });

  it('renders HomeScreen with user greeting, timeline filter, and dashboard sections', async () => {
    saveUserDetailsToStorage({
      user: {
        name: 'Rahul Joshi',
        age: 28,
        height: 170,
        weight: 60,
      },
    });

    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<HomeScreen />);
      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), 50);
      });
    });

    expect(tree).toBeDefined();
    const allText = getAllText(tree!.root);

    expect(allText).toContain('Rahul Joshi');

    expect(allText).toContain('7 Days');
    expect(allText).toContain('30 Days');
    expect(allText).toContain('3 Months');

    expect(allText).toContain('Apple Health');
    expect(allText).toContain('Connect');

    expect(allText).toContain('TARGET WEIGHT');
    expect(allText).toContain('Active Target');
    expect(allText).toContain('ACTIVE GOAL PROGRESS');

    expect(allText).toContain('CORE DAILY METRICS');
    expect(allText).toContain('Weight');
    expect(allText).toContain('Steps');
    expect(allText).toContain('Sleep');
    expect(allText).toContain('Calories');
  });

  it('sets healthKitConnected to true in MMKV and transitions to Connected status when Connect CTA is pressed', async () => {
    jest.spyOn(metricsService, 'syncExternalHealthData').mockResolvedValue({
      lastSyncedAt: '2 Oct 2026, 6:45 PM',
    });

    saveUserDetailsToStorage({
      user: {
        name: 'Rahul Joshi',
        age: 28,
        height: 170,
        weight: 60,
      },
    });

    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<HomeScreen />);
      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), 50);
      });
    });

    expect(storage.getBoolean('healthKitConnected')).toBeFalsy();

    const connectBtn = tree!.root.findByProps({
      accessibilityLabel: 'Connect Apple Health',
    });
    expect(connectBtn).toBeDefined();

    await ReactTestRenderer.act(async () => {
      await connectBtn.props.onPress();
    });

    expect(storage.getBoolean('healthKitConnected')).toBe(true);

    const allText = getAllText(tree!.root);
    expect(allText).toContain('Connected');
  });

  it('navigates to LogWeight screen when Weight metric card is clicked', async () => {
    saveUserDetailsToStorage({
      user: {
        name: 'Rahul Joshi',
        age: 28,
        height: 170,
        weight: 60,
      },
    });

    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<HomeScreen />);
      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), 50);
      });
    });

    const weightCard = tree!.root.find(
      node =>
        node.props?.accessibilityLabel &&
        node.props.accessibilityLabel.includes('Weight:') &&
        typeof node.props.onPress === 'function',
    );
    expect(weightCard).toBeDefined();

    await ReactTestRenderer.act(async () => {
      weightCard.props.onPress();
    });

    expect(mockNavigate).toHaveBeenCalledWith('MetricHistory', {
      metricId: expect.any(String),
      metricTitle: 'Weight',
      unit: expect.any(String),
    });
  });
});
