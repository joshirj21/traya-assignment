import {
  metricsService,
  METRICS_STORAGE_KEYS,
} from '../src/services/metricsService';
import { storage } from '../src/lib/storage';
import { WeightGoal } from '../src/types/metrics';

describe('MetricsService', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('fetches dashboard metrics for 7_days timeline', async () => {
    const res = await metricsService.getDashboardMetrics('7_days', {
      delayMs: 0,
    });
    expect(res.status).toBe(200);
    expect(res.data.period).toBe('7_days');
    expect(res.data.weightGoal.targetWeight).toBe(70.0);
    expect(res.data.coreMetrics.length).toBe(6);
  });

  it('fetches dashboard metrics for 30_days timeline', async () => {
    const res = await metricsService.getDashboardMetrics('30_days', {
      delayMs: 0,
    });
    expect(res.status).toBe(200);
    expect(res.data.period).toBe('30_days');
    expect(res.data.coreMetrics.some(m => m.title.includes('Avg'))).toBe(true);
  });

  it('fetches dashboard metrics for 3_months timeline', async () => {
    const res = await metricsService.getDashboardMetrics('3_months', {
      delayMs: 0,
    });
    expect(res.status).toBe(200);
    expect(res.data.period).toBe('3_months');
  });

  it('updates target weight and recalculates progress and remaining kg', () => {
    const initialGoal: WeightGoal = {
      targetWeight: 70.0,
      currentWeight: 72.5,
      startWeight: 75.0,
      targetSetDate: '21 Sep 2026',
      progressPercent: 50,
      remainingKg: 2.5,
    };

    const updated = metricsService.updateTargetWeight(65.0, initialGoal);
    expect(updated.targetWeight).toBe(65.0);
    expect(updated.remainingKg).toBe(7.5);

    expect(updated.progressPercent).toBe(25);

    const raw = storage.getString(METRICS_STORAGE_KEYS.CUSTOM_TARGET_GOAL);
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.targetWeight).toBe(65.0);
  });

  it('simulates external health sync and saves last synced timestamp', async () => {
    const syncResult = await metricsService.syncExternalHealthData(0);
    expect(syncResult.lastSyncedAt).toBeDefined();

    const storedTimestamp = metricsService.getLastSyncedTime();
    expect(storedTimestamp).toBe(syncResult.lastSyncedAt);
  });
});
