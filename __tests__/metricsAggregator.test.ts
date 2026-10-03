import { metricsAggregator } from '../src/health/metricsAggregator';
import MockHealthKit from '../src/mockHealthKit';

describe('MetricsAggregator Integration', () => {
  beforeEach(() => {
    MockHealthKit.resetMockData();
  });

  it('computes 7_days dashboard metrics accurately from HealthKit data', async () => {
    await MockHealthKit.initHealthKit();

    const data = await metricsAggregator.computeDashboardMetrics('7_days');

    expect(data.period).toBe('7_days');
    expect(data.coreMetrics.length).toBe(6);

    const stepMetric = data.coreMetrics.find(m => m.id === 'steps');
    expect(stepMetric).toBeDefined();
    expect(stepMetric?.title).toBe('Steps');
    expect(stepMetric?.unit).toBe('steps');

    const weightMetric = data.coreMetrics.find(m => m.id === 'weight');
    expect(weightMetric).toBeDefined();
    expect(weightMetric?.value).toBe('72.5');

    const sleepMetric = data.coreMetrics.find(m => m.id === 'sleep');
    expect(sleepMetric).toBeDefined();
    expect(sleepMetric?.value).toContain('h');

    const waterMetric = data.coreMetrics.find(m => m.id === 'water');
    expect(waterMetric).toBeDefined();
    expect(waterMetric?.unit).toBe('L');

    const calMetric = data.coreMetrics.find(m => m.id === 'calories');
    expect(calMetric).toBeDefined();
    expect(calMetric?.unit).toBe('kcal');
  });

  it('computes 30_days average metrics with correct titles', async () => {
    await MockHealthKit.initHealthKit();

    const data = await metricsAggregator.computeDashboardMetrics('30_days');

    expect(data.period).toBe('30_days');
    const stepMetric = data.coreMetrics.find(m => m.id === 'steps');
    expect(stepMetric?.title).toBe('Steps (Avg)');

    const calMetric = data.coreMetrics.find(m => m.id === 'calories');
    expect(calMetric?.title).toBe('Calories (Avg)');
  });

  it('computes 3_months overview metrics', async () => {
    await MockHealthKit.initHealthKit();

    const data = await metricsAggregator.computeDashboardMetrics('3_months');

    expect(data.period).toBe('3_months');
    const weightMetric = data.coreMetrics.find(m => m.id === 'weight');
    expect(weightMetric?.title).toBe('Weight (Trend)');
  });

  it('applies custom weight goals and calculates progress percentage', async () => {
    await MockHealthKit.initHealthKit();

    const customGoal = {
      targetWeight: 68.0,
      startWeight: 76.0,
      targetSetDate: '1 Sep 2026',
    };

    const data = await metricsAggregator.computeDashboardMetrics(
      '7_days',
      customGoal,
    );

    expect(data.weightGoal.targetWeight).toBe(68.0);
    expect(data.weightGoal.startWeight).toBe(76.0);
    expect(data.weightGoal.currentWeight).toBe(72.5);

    expect(data.weightGoal.progressPercent).toBe(44);
    expect(data.weightGoal.remainingKg).toBe(4.5);
  });
});
