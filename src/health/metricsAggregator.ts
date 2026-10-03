

import MockHealthKit, { HealthSample, MetricType } from '../mockHealthKit';
import {
  DashboardMetricsData,
  MetricItem,
  TimelinePeriod,
  WeightGoal,
} from '../types/metrics';
import { normalizeHealthSamples } from './normalizer';

export class MetricsAggregator {

  public async computeDashboardMetrics(
    period: TimelinePeriod,
    customWeightGoal?: Partial<WeightGoal> | null,
  ): Promise<DashboardMetricsData> {

    if (!MockHealthKit.getConnectionStatus().initialized) {
      await MockHealthKit.initHealthKit();
    }

    const todayStr = this.getTodayDateString();
    const dateRange = this.calculateDateRange(period);

    const [
      stepSamples,
      sleepSamples,
      calorieSamples,
      waterSamples,
      activitySamples,
      weightSamples,
    ] = await Promise.all([
      MockHealthKit.getStepCount({ startDate: dateRange.startDate }),
      MockHealthKit.getSleepSamples({ startDate: dateRange.startDate }),
      MockHealthKit.getActiveEnergyBurned({ startDate: dateRange.startDate }),
      MockHealthKit.getWaterSamples({ startDate: dateRange.startDate }),
      MockHealthKit.getActivitySamples({ startDate: dateRange.startDate }),
      MockHealthKit.getWeightSamples({ startDate: dateRange.startDate }),
    ]);

    const normalizedSamples = normalizeHealthSamples([
      ...stepSamples,
      ...sleepSamples,
      ...calorieSamples,
      ...waterSamples,
      ...activitySamples,
      ...weightSamples,
    ]);
    const samplesFor = (metric: MetricType) =>
      normalizedSamples.filter(sample => sample.metricType === metric);
    const normalizedSteps = samplesFor('steps');
    const normalizedSleep = samplesFor('sleep');
    const normalizedCalories = samplesFor('calories');
    const normalizedWater = samplesFor('water');
    const normalizedActivity = samplesFor('activity');
    const normalizedWeight = samplesFor('weight');

    const coreMetrics = this.buildCoreMetrics(period, todayStr, {
      steps: normalizedSteps,
      sleep: normalizedSleep,
      calories: normalizedCalories,
      water: normalizedWater,
      activity: normalizedActivity,
      weight: normalizedWeight,
    });

    const weightGoal = this.buildWeightGoal(normalizedWeight, customWeightGoal);

    const latestSampleTime = this.findLatestTimestamp([
      ...normalizedSamples,
    ]);

    return {
      period,
      weightGoal,
      coreMetrics,
      lastSyncedAt: latestSampleTime || 'Just now',
      fetchedAt: new Date().toISOString(),
    };
  }

  private buildCoreMetrics(
    period: TimelinePeriod,
    todayStr: string,
    data: {
      steps: HealthSample[];
      sleep: HealthSample[];
      calories: HealthSample[];
      water: HealthSample[];
      activity: HealthSample[];
      weight: HealthSample[];
      heart_rate?: HealthSample[];
    },
  ): MetricItem[] {
    const isTodayOr7Days = period === '7_days';

    const latestEndTime = (samples: HealthSample[]): string | undefined => {
      if (samples.length === 0) return undefined;
      return samples.reduce<string | undefined>((best, s) => {
        const t = s.endTime || s.startTime;
        return !best || t > best ? t : best;
      }, undefined);
    };

    const sortedWeight = [...data.weight].sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );
    const latestWeight = sortedWeight.length > 0 ? sortedWeight[0].value : 0;
    const avgWeight = this.calculateAverage(data.weight);
    const weightItem: MetricItem = {
      id: 'weight',
      title: isTodayOr7Days
        ? 'Weight'
        : period === '30_days'
        ? 'Weight (Avg)'
        : 'Weight (Trend)',
      value:
        sortedWeight.length > 0
          ? (isTodayOr7Days ? latestWeight : avgWeight).toFixed(1)
          : '—',
      unit: 'kg',
      ...(latestWeight > 0 ? { goal: 'Target: 70.0 kg' } : {}),
      iconName: 'weight',
      measuredAt: sortedWeight[0]?.endTime ?? sortedWeight[0]?.startTime,
    };

    const todayStepSamples = data.steps.filter(s =>
      s.startTime.startsWith(todayStr),
    );
    const todaySteps = todayStepSamples.reduce((sum, s) => sum + s.value, 0);
    const avgSteps = this.calculateDailyAverageSum(data.steps);
    const latestStepSample = [...todayStepSamples].sort(
      (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime(),
    )[0];
    const stepsItem: MetricItem = {
      id: 'steps',
      title: isTodayOr7Days ? 'Steps' : 'Steps (Avg)',
      value:
        (isTodayOr7Days ? todayStepSamples.length > 0 : data.steps.length > 0)
          ? (isTodayOr7Days ? todaySteps : avgSteps).toLocaleString()
          : '—',
      unit: 'steps',
      goal: 'Goal: 10,000 steps',
      iconName: 'steps',
      measuredAt:
        latestStepSample?.endTime ??
        latestStepSample?.startTime ??
        latestEndTime(data.steps),
    };

    const todaySleep =
      data.sleep.find(s => s.endTime.startsWith(todayStr)) ||
      data.sleep[data.sleep.length - 1];
    const sleepMinutes = isTodayOr7Days
      ? todaySleep?.value
      : data.sleep.length > 0
      ? Math.round(this.calculateAverage(data.sleep))
      : undefined;
    const sleepHours = Math.floor((sleepMinutes ?? 0) / 60);
    const sleepMins = Math.round((sleepMinutes ?? 0) % 60);
    const sleepItem: MetricItem = {
      id: 'sleep',
      title: isTodayOr7Days ? 'Sleep' : 'Sleep (Avg)',
      value:
        sleepMinutes === undefined
          ? '—'
          : `${sleepHours}h ${String(sleepMins).padStart(2, '0')}m`,
      goal: 'Goal: 8h 00m',
      iconName: 'sleep',
      measuredAt: todaySleep?.endTime ?? todaySleep?.startTime,
    };

    const todayCalorieSamples = data.calories.filter(s =>
      s.startTime.startsWith(todayStr),
    );
    const todayCalories = todayCalorieSamples.reduce(
      (sum, s) => sum + s.value,
      0,
    );
    const avgCalories = this.calculateDailyAverageSum(data.calories);
    const caloriesItem: MetricItem = {
      id: 'calories',
      title: isTodayOr7Days ? 'Calories' : 'Calories (Avg)',
      value:
        (isTodayOr7Days
          ? todayCalorieSamples.length > 0
          : data.calories.length > 0)
          ? (isTodayOr7Days ? todayCalories : avgCalories).toLocaleString()
          : '—',
      unit: 'kcal',
      goal: isTodayOr7Days ? 'Burned today' : 'Daily avg',
      iconName: 'calories',
      measuredAt: latestEndTime(
        isTodayOr7Days ? todayCalorieSamples : data.calories,
      ),
    };

    const todayWaterSamples = data.water.filter(s =>
      s.startTime.startsWith(todayStr),
    );
    const todayWaterLiters = todayWaterSamples.reduce((sum, s) => sum + s.value, 0);
    const avgWaterLiters = this.calculateDailyAverageSum(data.water);
    const waterLiters =
      (isTodayOr7Days ? todayWaterSamples.length > 0 : data.water.length > 0)
        ? (isTodayOr7Days ? todayWaterLiters : avgWaterLiters).toFixed(1)
        : '—';
    const waterItem: MetricItem = {
      id: 'water',
      title: isTodayOr7Days ? 'Water' : 'Water (Avg)',
      value: waterLiters,
      unit: 'L',
      goal: 'Goal: 3.0 L',
      iconName: 'water',
      measuredAt: latestEndTime(
        isTodayOr7Days ? todayWaterSamples : data.water,
      ),
    };

    const todayActivitySamples = data.activity.filter(s =>
      s.startTime.startsWith(todayStr),
    );
    const todayActivity = todayActivitySamples.reduce(
      (sum, s) => sum + s.value,
      0,
    );
    const avgActivity = this.calculateDailyAverageSum(data.activity);
    const activityItem: MetricItem = {
      id: 'activity',
      title: isTodayOr7Days ? 'Activity' : 'Activity (Avg)',
      value:
        (isTodayOr7Days
          ? todayActivitySamples.length > 0
          : data.activity.length > 0)
          ? String(Math.round(isTodayOr7Days ? todayActivity : avgActivity))
          : '—',
      unit: 'min',
      goal: 'Goal: 60 min',
      iconName: 'activity',
      measuredAt: latestEndTime(
        isTodayOr7Days ? todayActivitySamples : data.activity,
      ),
    };

    return [
      weightItem,
      stepsItem,
      sleepItem,
      caloriesItem,
      waterItem,
      activityItem,
    ];
  }

  private buildWeightGoal(
    weightSamples: HealthSample[],
    customGoal?: Partial<WeightGoal> | null,
  ): WeightGoal {
    const startWeight = customGoal?.startWeight ?? 75.0;
    const targetWeight = customGoal?.targetWeight ?? 70.0;
    const targetSetDate = customGoal?.targetSetDate ?? '21 Sep 2026';

    const sortedWeight = [...weightSamples].sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );

    const currentWeight =
      sortedWeight.length > 0
        ? sortedWeight[0].value
        : customGoal?.currentWeight ?? 0;

    let progressPercent = 0;
    if (startWeight !== targetWeight) {
      progressPercent = Math.round(
        ((startWeight - currentWeight) / (startWeight - targetWeight)) * 100,
      );
      progressPercent = Math.min(Math.max(progressPercent, 0), 100);
    }

    const remainingKg = Math.max(
      0,
      Math.round((currentWeight - targetWeight) * 10) / 10,
    );

    return {
      startWeight,
      currentWeight,
      targetWeight,
      targetSetDate,
      progressPercent: customGoal?.progressPercent ?? progressPercent,
      remainingKg: customGoal?.remainingKg ?? remainingKg,
    };
  }

  private calculateAverage(samples: HealthSample[]): number {
    if (samples.length === 0) return 0;
    const total = samples.reduce((acc, s) => acc + s.value, 0);
    return Math.round((total / samples.length) * 10) / 10;
  }

  private calculateDailyAverageSum(samples: HealthSample[]): number {
    if (samples.length === 0) return 0;
    const daysMap = new Map<string, number>();

    samples.forEach(sample => {
      const day = sample.startTime.slice(0, 10);
      daysMap.set(day, (daysMap.get(day) || 0) + sample.value);
    });

    if (daysMap.size === 0) return 0;
    const totalSum = Array.from(daysMap.values()).reduce(
      (sum, val) => sum + val,
      0,
    );
    return Math.round(totalSum / daysMap.size);
  }

  private calculateDateRange(period: TimelinePeriod): {
    startDate: string;
    endDate: string;
  } {
    const now = new Date();
    const days = period === '7_days' ? 7 : period === '30_days' ? 30 : 90;
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    };
  }

  private getTodayDateString(): string {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private findLatestTimestamp(samples: HealthSample[]): string | null {
    if (samples.length === 0) return null;
    let latestMs = 0;

    samples.forEach(s => {
      const ms = new Date(s.endTime || s.startTime).getTime();
      if (ms > latestMs) latestMs = ms;
    });

    if (latestMs === 0) return null;
    const d = new Date(latestMs);
    return `${d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}, ${d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`;
  }
}

export const metricsAggregator = new MetricsAggregator();
export default metricsAggregator;
