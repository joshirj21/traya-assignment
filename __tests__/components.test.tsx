import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {
  ExternalSourcesCard,
  GoalProgressCard,
  MetricCard,
  MetricIcon,
  TargetWeightCard,
  TimelineFilter,
} from '../src/components';
import { MetricItem, WeightGoal } from '../src/types/metrics';

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

describe('Fitness Dashboard Components', () => {
  const mockGoal: WeightGoal = {
    targetWeight: 70.0,
    currentWeight: 72.5,
    startWeight: 75.0,
    targetSetDate: '21 Sep 2026',
    progressPercent: 83,
    remainingKg: 2.5,
  };

  const mockMetric: MetricItem = {
    id: 'steps',
    title: 'Steps',
    value: '8,420',
    unit: 'steps',
    goal: 'Goal: 10,000 steps',
    iconName: 'steps',
  };

  it('renders TimelineFilter with all 3 options and calls onSelectPeriod', async () => {
    const onSelect = jest.fn();
    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <TimelineFilter selectedPeriod="7_days" onSelectPeriod={onSelect} />,
      );
    });

    const allText = getAllText(tree!.root);
    expect(allText).toContain('7 Days');
    expect(allText).toContain('30 Days');
    expect(allText).toContain('3 Months');
  });

  it('renders GoalProgressCard with percentage and remaining values', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<GoalProgressCard goal={mockGoal} />);
    });

    const allText = getAllText(tree!.root);
    expect(allText).toContain('83');
    expect(allText).toContain('% Completed');
    expect(allText).toContain('70.0');
    expect(allText).toContain('2.5 kg remaining');
  });

  it('renders TargetWeightCard with active target badge and target value', async () => {
    const onUpdate = jest.fn();
    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <TargetWeightCard goal={mockGoal} onUpdateTarget={onUpdate} />,
      );
    });

    const allText = getAllText(tree!.root);
    expect(allText).toContain('Active Target');
    expect(allText).toContain('70.0');
    expect(allText).toContain('21 Sep 2026');
  });

  it('renders MetricCard with icon, title, value, unit, and goal', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<MetricCard metric={mockMetric} />);
    });

    const allText = getAllText(tree!.root);
    expect(allText).toContain('Steps');
    expect(allText).toContain('8,420');
    expect(allText).toContain('steps');
    expect(allText).toContain('Goal: 10,000 steps');
  });

  it('renders ExternalSourcesCard with Connect CTA when disconnected', async () => {
    const onConnect = jest.fn();
    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ExternalSourcesCard
          isConnected={false}
          isConnecting={false}
          onConnect={onConnect}
        />,
      );
    });

    const allText = getAllText(tree!.root);
    expect(allText).toContain('Apple Health');
    expect(allText).toContain('Connect');
  });

  it('renders ExternalSourcesCard with Connected status badge when connected', async () => {
    const onConnect = jest.fn();
    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <ExternalSourcesCard
          isConnected={true}
          isConnecting={false}
          lastSyncedAt="21 Sep 2026, 10:45 AM"
          onConnect={onConnect}
        />,
      );
    });

    const allText = getAllText(tree!.root);
    expect(allText).toContain('Apple Health');
    expect(allText).toContain('Connected');
    expect(allText).toContain('21 Sep 2026, 10:45 AM');
  });

  it('renders MetricIcon for each metric type', async () => {
    const types: Array<
      'weight' | 'steps' | 'sleep' | 'calories' | 'water' | 'activity'
    > = ['weight', 'steps', 'sleep', 'calories', 'water', 'activity'];

    for (const type of types) {
      let tree: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        tree = ReactTestRenderer.create(<MetricIcon name={type} />);
      });
      expect(tree?.toJSON()).toBeTruthy();
    }
  });
});
